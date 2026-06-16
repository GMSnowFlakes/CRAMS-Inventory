<?php

namespace App\Modules\PurchaseOrders\Services;

use App\Models\InventoryMovement;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseOrderPayment;
use App\Models\StockLevel;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class PurchaseOrderService
{
    public function paginate(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $q = PurchaseOrder::where('company_id', $companyId)
            ->with(['supplier', 'branch', 'createdBy'])
            ->orderByDesc('created_at');

        if (!empty($filters['status'])) {
            $q->where('status', $filters['status']);
        }
        if (!empty($filters['supplier_id'])) {
            $q->where('supplier_id', $filters['supplier_id']);
        }
        if (!empty($filters['search'])) {
            $q->where(function ($sq) use ($filters) {
                $sq->where('po_number', 'ilike', "%{$filters['search']}%")
                   ->orWhereHas('supplier', fn ($s) => $s->where('name', 'ilike', "%{$filters['search']}%"));
            });
        }

        return $q->paginate(20);
    }

    public function create(int $companyId, int $userId, array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($companyId, $userId, $data) {
            $items = $data['items'] ?? [];
            unset($data['items']);

            [$subtotal, $tax] = $this->calculateTotals($items, $data['tax_rate'] ?? 0);

            $po = PurchaseOrder::create(array_merge($data, [
                'company_id' => $companyId,
                'created_by' => $userId,
                'po_number'  => $this->nextPoNumber($companyId),
                'subtotal'   => $subtotal,
                'tax'        => $tax,
                'total'      => $subtotal + $tax,
            ]));

            foreach ($items as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'product_id'        => $item['product_id'],
                    'quantity_ordered'  => $item['quantity'],
                    'quantity_received' => 0,
                    'unit_cost'         => $item['unit_cost'],
                    'total_cost'        => $item['quantity'] * $item['unit_cost'],
                ]);
            }

            return $po->load(['items.product', 'supplier', 'branch']);
        });
    }

    public function receive(int $companyId, PurchaseOrder $po, array $receivedItems): PurchaseOrder
    {
        abort_if(
            in_array($po->status, ['received', 'cancelled']),
            422,
            'Purchase order is already ' . $po->status . '.'
        );

        return DB::transaction(function () use ($companyId, $po, $receivedItems) {
            foreach ($receivedItems as $itemData) {
                /** @var PurchaseOrderItem $item */
                $item = $po->items()->where('product_id', $itemData['product_id'])->firstOrFail();

                $qty = (float) $itemData['quantity_received'];
                $maxReceivable = $item->quantity_ordered - $item->quantity_received;
                abort_if($qty > $maxReceivable, 422, "Quantity exceeds ordered amount for product {$item->product_id}.");

                $item->increment('quantity_received', $qty);

                // Update stock
                $stockLevel = StockLevel::firstOrCreate(
                    ['company_id' => $companyId, 'product_id' => $item->product_id, 'branch_id' => $po->branch_id],
                    ['quantity' => 0]
                );
                $before = $stockLevel->quantity;
                $stockLevel->increment('quantity', $qty);
                $after = $before + $qty;

                InventoryMovement::create([
                    'company_id'      => $companyId,
                    'product_id'      => $item->product_id,
                    'branch_id'       => $po->branch_id,
                    'type'            => 'stock_in',
                    'quantity'        => $qty,
                    'quantity_before' => $before,
                    'quantity_after'  => $after,
                    'unit_cost'       => $item->unit_cost,
                    'reference'       => $po->po_number,
                    'notes'           => 'Purchase Order receipt',
                    'user_id'         => auth()->id(),
                ]);
            }

            $po->refresh();
            $allReceived = $po->items->every(
                fn($i) => $i->quantity_received >= $i->quantity_ordered
            );
            $anyReceived = $po->items->some(fn($i) => $i->quantity_received > 0);

            $po->update([
                'status'        => $allReceived ? 'received' : ($anyReceived ? 'partial' : $po->status),
                'received_date' => $allReceived ? now() : null,
            ]);

            return $po->load(['items.product', 'supplier', 'branch']);
        });
    }

    public function cancel(PurchaseOrder $po): PurchaseOrder
    {
        abort_if(
            in_array($po->status, ['received', 'cancelled']),
            422,
            'Cannot cancel a ' . $po->status . ' order.'
        );
        $po->update(['status' => 'cancelled']);
        return $po->fresh();
    }

    private function calculateTotals(array $items, float $taxRate): array
    {
        $subtotal = array_sum(array_map(
            fn($i) => $i['quantity'] * $i['unit_cost'],
            $items
        ));
        $tax = $subtotal * ($taxRate / 100);
        return [$subtotal, $tax];
    }

    public function recordPayment(PurchaseOrder $po, int $userId, array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($po, $userId, $data) {
            PurchaseOrderPayment::create(array_merge($data, [
                'purchase_order_id' => $po->id,
                'created_by'        => $userId,
            ]));

            $totalPaid = PurchaseOrderPayment::where('purchase_order_id', $po->id)->sum('amount');
            $po->update(['amount_paid' => $totalPaid]);

            return $po->fresh(['items.product', 'supplier', 'branch', 'payments']);
        });
    }

    private function nextPoNumber(int $companyId): string
    {
        $count = PurchaseOrder::where('company_id', $companyId)->count() + 1;
        return 'PO-' . str_pad($count, 6, '0', STR_PAD_LEFT);
    }
}
