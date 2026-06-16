<?php

namespace App\Modules\Sales\Services;

use App\Mail\LowStockAlert;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\StockLevel;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class SaleService
{
    public function paginate(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $q = Sale::where('company_id', $companyId)
            ->with(['customer', 'branch', 'createdBy'])
            ->orderByDesc('sale_date')
            ->orderByDesc('id');

        if (!empty($filters['status'])) {
            $q->where('status', $filters['status']);
        }
        if (!empty($filters['customer_id'])) {
            $q->where('customer_id', $filters['customer_id']);
        }
        if (!empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $q->where(function ($sub) use ($term) {
                $sub->where('invoice_number', 'ilike', $term)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'ilike', $term));
            });
        }

        return $q->paginate(20);
    }

    public function create(int $companyId, int $userId, array $data): Sale
    {
        return DB::transaction(function () use ($companyId, $userId, $data) {
            $items    = $data['items'] ?? [];
            $taxRate  = (float) ($data['tax_rate'] ?? 0);
            $discount = (float) ($data['discount'] ?? 0);
            $status   = $data['status'] ?? 'draft';

            $subtotal = $this->calcSubtotal($items);
            $tax      = $subtotal * ($taxRate / 100);
            $total    = max(0, $subtotal + $tax - $discount);

            $sale = Sale::create([
                'company_id'     => $companyId,
                'customer_id'    => $data['customer_id'] ?? null,
                'branch_id'      => $data['branch_id'] ?? null,
                'created_by'     => $userId,
                'invoice_number' => $this->nextInvoiceNumber($companyId),
                'status'         => $status,
                'sale_date'      => $data['sale_date'],
                'due_date'       => $data['due_date'] ?? null,
                'subtotal'       => $subtotal,
                'discount'       => $discount,
                'tax'            => $tax,
                'total'          => $total,
                'amount_paid'    => 0,
                'notes'          => $data['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                $lineDiscount = (float) ($item['discount'] ?? 0);
                $lineTaxRate  = (float) ($item['tax_rate'] ?? 0);
                $gross        = ((float) $item['quantity'] * (float) $item['unit_price']) - $lineDiscount;
                $lineTax      = $gross * ($lineTaxRate / 100);
                $lineTotal    = $gross + $lineTax;

                SaleItem::create([
                    'sale_id'    => $sale->id,
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount'   => $lineDiscount,
                    'tax_rate'   => $lineTaxRate,
                    'total'      => max(0, $lineTotal),
                ]);
            }

            if ($status === 'confirmed') {
                $this->deductStock($companyId, $sale);
            }

            return $sale->load(['items.product', 'customer', 'branch']);
        });
    }

    public function confirm(int $companyId, Sale $sale): Sale
    {
        abort_if($sale->status !== 'draft', 422, 'Only draft sales can be confirmed.');

        return DB::transaction(function () use ($companyId, $sale) {
            $sale->update(['status' => 'confirmed']);
            $this->deductStock($companyId, $sale->load('items'));
            return $sale->fresh(['items.product', 'customer', 'branch']);
        });
    }

    public function recordPayment(Sale $sale, float $amount, array $meta = []): Sale
    {
        abort_if(
            in_array($sale->status, ['draft', 'cancelled']),
            422,
            'Cannot record payment on a ' . $sale->status . ' sale.'
        );

        $newPaid = min($sale->amount_paid + $amount, $sale->total);
        $status  = $newPaid >= $sale->total ? 'paid' : 'partial';

        $sale->update(['amount_paid' => $newPaid, 'status' => $status]);

        SalePayment::create([
            'sale_id'        => $sale->id,
            'created_by'     => auth()->id(),
            'amount'         => $amount,
            'payment_method' => $meta['payment_method'] ?? 'cash',
            'reference'      => $meta['reference'] ?? null,
            'notes'          => $meta['notes'] ?? null,
        ]);

        return $sale->fresh(['items.product', 'customer', 'branch', 'payments']);
    }

    public function cancel(int $companyId, Sale $sale): Sale
    {
        abort_if($sale->status === 'cancelled', 422, 'Sale is already cancelled.');

        return DB::transaction(function () use ($companyId, $sale) {
            if (in_array($sale->status, ['confirmed', 'partial', 'paid'])) {
                $this->restoreStock($companyId, $sale->load('items'));
            }
            $sale->update(['status' => 'cancelled']);
            return $sale->fresh();
        });
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function deductStock(int $companyId, Sale $sale): void
    {
        foreach ($sale->items as $item) {
            $stock = StockLevel::firstOrCreate(
                ['company_id' => $companyId, 'product_id' => $item->product_id, 'branch_id' => $sale->branch_id],
                ['quantity' => 0]
            );
            $before = $stock->quantity;
            $stock->decrement('quantity', $item->quantity);

            $after = $before - $item->quantity;

            InventoryMovement::create([
                'company_id'      => $companyId,
                'product_id'      => $item->product_id,
                'branch_id'       => $sale->branch_id,
                'type'            => 'stock_out',
                'quantity'        => $item->quantity,
                'quantity_before' => $before,
                'quantity_after'  => $after,
                'unit_cost'       => $item->unit_price,
                'reference'       => $sale->invoice_number,
                'notes'           => 'Sale',
                'user_id'         => auth()->id(),
            ]);

            $this->dispatchLowStockAlertIfNeeded($companyId, $item->product_id, $after);
        }
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

    private function restoreStock(int $companyId, Sale $sale): void
    {
        foreach ($sale->items as $item) {
            $stock = StockLevel::firstOrCreate(
                ['company_id' => $companyId, 'product_id' => $item->product_id, 'branch_id' => $sale->branch_id],
                ['quantity' => 0]
            );
            $before = $stock->quantity;
            $stock->increment('quantity', $item->quantity);

            InventoryMovement::create([
                'company_id'      => $companyId,
                'product_id'      => $item->product_id,
                'branch_id'       => $sale->branch_id,
                'type'            => 'stock_in',
                'quantity'        => $item->quantity,
                'quantity_before' => $before,
                'quantity_after'  => $before + $item->quantity,
                'unit_cost'       => $item->unit_price,
                'reference'       => $sale->invoice_number,
                'notes'           => 'Sale cancellation',
                'user_id'         => auth()->id(),
            ]);
        }
    }

    private function calcSubtotal(array $items): float
    {
        return array_sum(array_map(function ($i) {
            $gross    = ((float) $i['quantity'] * (float) $i['unit_price']) - (float) ($i['discount'] ?? 0);
            $lineTax  = $gross * ((float) ($i['tax_rate'] ?? 0) / 100);
            return $gross + $lineTax;
        }, $items));
    }

    private function nextInvoiceNumber(int $companyId): string
    {
        $count = Sale::where('company_id', $companyId)->count() + 1;
        return 'INV-' . str_pad($count, 6, '0', STR_PAD_LEFT);
    }
}
