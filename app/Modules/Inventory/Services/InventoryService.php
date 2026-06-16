<?php

namespace App\Modules\Inventory\Services;

use App\Mail\LowStockAlert;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\StockLevel;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class InventoryService
{
    public function stockIn(int $companyId, int $userId, array $data): InventoryMovement
    {
        return DB::transaction(function () use ($companyId, $userId, $data) {
            $stock = $this->lockStock($companyId, $data['product_id']);
            $before = $stock->quantity;
            $after  = $before + $data['quantity'];

            $stock->update(['quantity' => $after]);

            return InventoryMovement::create([
                'company_id'      => $companyId,
                'product_id'      => $data['product_id'],
                'user_id'         => $userId,
                'type'            => 'stock_in',
                'quantity'        => $data['quantity'],
                'quantity_before' => $before,
                'quantity_after'  => $after,
                'unit_cost'       => $data['unit_cost'] ?? null,
                'reference'       => $data['reference'] ?? null,
                'notes'           => $data['notes'] ?? null,
            ]);
        });
    }

    public function adjust(int $companyId, int $userId, array $data): InventoryMovement
    {
        return DB::transaction(function () use ($companyId, $userId, $data) {
            $stock  = $this->lockStock($companyId, $data['product_id']);
            $before = $stock->quantity;
            $after  = $data['quantity'];

            $stock->update(['quantity' => $after]);

            return InventoryMovement::create([
                'company_id'      => $companyId,
                'product_id'      => $data['product_id'],
                'user_id'         => $userId,
                'type'            => 'adjustment',
                'quantity'        => $after - $before,
                'quantity_before' => $before,
                'quantity_after'  => $after,
                'reference'       => $data['reference'] ?? null,
                'notes'           => $data['notes'] ?? null,
            ]);
        });
    }

    public function stockOut(int $companyId, int $userId, array $data): InventoryMovement
    {
        return DB::transaction(function () use ($companyId, $userId, $data) {
            $stock  = $this->lockStock($companyId, $data['product_id']);
            $before = $stock->quantity;

            if ($before < $data['quantity']) {
                throw new \DomainException("Insufficient stock. Available: {$before}");
            }

            $after = $before - $data['quantity'];
            $stock->update(['quantity' => $after]);

            $movement = InventoryMovement::create([
                'company_id'      => $companyId,
                'product_id'      => $data['product_id'],
                'user_id'         => $userId,
                'type'            => 'stock_out',
                'quantity'        => $data['quantity'],
                'quantity_before' => $before,
                'quantity_after'  => $after,
                'reference'       => $data['reference'] ?? null,
                'notes'           => $data['notes'] ?? null,
            ]);

            $this->dispatchLowStockAlertIfNeeded($companyId, $data['product_id'], $after);

            return $movement;
        });
    }

    private function dispatchLowStockAlertIfNeeded(int $companyId, int $productId, int $currentQty): void
    {
        try {
            $product = Product::find($productId);
            if ($product && $currentQty <= $product->reorder_level) {
                $recipients = User::where('company_id', $companyId)
                    ->where('role', 'admin')
                    ->get();

                if ($recipients->isNotEmpty() && config('crams.mail_enabled')) {
                    Mail::to($recipients)->queue(new LowStockAlert($product, $currentQty, $product->reorder_level));
                }
            }
        } catch (\Throwable) {
            // Mail failure must never break the main operation
        }
    }

    public function movements(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $query = InventoryMovement::with(['product', 'user'])
            ->where('company_id', $companyId);

        if (!empty($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['from'])) {
            $query->whereDate('created_at', '>=', $filters['from']);
        }

        if (!empty($filters['to'])) {
            $query->whereDate('created_at', '<=', $filters['to']);
        }

        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        return $query->orderByDesc('created_at')->paginate(25);
    }

    public function stockLevels(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $query = Product::with(['stockLevel', 'supplier'])
            ->where('company_id', $companyId)
            ->where('is_active', true);

        if (!empty($filters['low_stock'])) {
            $query->whereHas('stockLevel', function ($q) {
                $q->whereColumn('quantity', '<=', 'products.reorder_level');
            });
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'ilike', "%{$filters['search']}%")
                  ->orWhere('sku', 'ilike', "%{$filters['search']}%");
            });
        }

        return $query->orderBy('name')->paginate(25);
    }

    private function lockStock(int $companyId, int $productId): StockLevel
    {
        return StockLevel::where('company_id', $companyId)
            ->where('product_id', $productId)
            ->lockForUpdate()
            ->firstOrFail();
    }
}
