<?php

namespace App\Modules\StockCount\Services;

use App\Models\InventoryMovement;
use App\Models\StockCount;
use App\Models\StockCountItem;
use App\Models\StockLevel;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class StockCountService
{
    public function paginate(int $companyId): LengthAwarePaginator
    {
        return StockCount::where('company_id', $companyId)
            ->with(['branch', 'createdBy'])
            ->orderByDesc('created_at')
            ->paginate(20);
    }

    public function create(int $companyId, int $userId, array $data): StockCount
    {
        return DB::transaction(function () use ($companyId, $userId, $data) {
            $branchId = $data['branch_id'] ?? null;

            $count = StockCount::create([
                'company_id' => $companyId,
                'branch_id'  => $branchId,
                'created_by' => $userId,
                'reference'  => $this->nextReference($companyId),
                'notes'      => $data['notes'] ?? null,
                'status'     => 'open',
            ]);

            // Snapshot current stock for all products in scope
            $stockQuery = StockLevel::where('company_id', $companyId)
                ->with('product');

            if ($branchId) {
                $stockQuery->where('branch_id', $branchId);
            }

            foreach ($stockQuery->get() as $sl) {
                StockCountItem::create([
                    'stock_count_id' => $count->id,
                    'product_id'     => $sl->product_id,
                    'system_qty'     => $sl->quantity,
                    'counted_qty'    => null,
                ]);
            }

            return $count->load(['items.product', 'branch', 'createdBy']);
        });
    }

    public function updateCounts(StockCount $count, array $items): StockCount
    {
        abort_if($count->status === 'committed', 422, 'Count is already committed.');

        foreach ($items as $item) {
            $count->items()
                ->where('product_id', $item['product_id'])
                ->update(['counted_qty' => $item['counted_qty']]);
        }

        return $count->load(['items.product', 'branch']);
    }

    public function commit(int $companyId, StockCount $count): StockCount
    {
        abort_if($count->status === 'committed', 422, 'Already committed.');

        return DB::transaction(function () use ($companyId, $count) {
            foreach ($count->items as $item) {
                if ($item->counted_qty === null) {
                    continue;
                }

                $variance = $item->counted_qty - $item->system_qty;
                if ($variance == 0) {
                    continue;
                }

                $stockLevel = StockLevel::firstOrCreate(
                    ['company_id' => $companyId, 'product_id' => $item->product_id, 'branch_id' => $count->branch_id],
                    ['quantity' => 0]
                );
                $before = $stockLevel->quantity;
                $stockLevel->increment('quantity', $variance);
                $after = $before + $variance;

                InventoryMovement::create([
                    'company_id'      => $companyId,
                    'product_id'      => $item->product_id,
                    'branch_id'       => $count->branch_id,
                    'type'            => 'adjustment',
                    'quantity'        => $variance,
                    'quantity_before' => $before,
                    'quantity_after'  => $after,
                    'reference'       => $count->reference,
                    'notes'           => 'Stock count reconciliation',
                    'user_id'         => auth()->id(),
                ]);
            }

            $count->update(['status' => 'committed', 'committed_at' => now()]);

            return $count->load(['items.product', 'branch', 'createdBy']);
        });
    }

    private function nextReference(int $companyId): string
    {
        $count = StockCount::where('company_id', $companyId)->count() + 1;
        return 'SC-' . str_pad($count, 6, '0', STR_PAD_LEFT);
    }
}
