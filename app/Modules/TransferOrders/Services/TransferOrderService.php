<?php

namespace App\Modules\TransferOrders\Services;

use App\Models\InventoryMovement;
use App\Models\StockLevel;
use App\Models\TransferOrder;
use App\Models\TransferOrderItem;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class TransferOrderService
{
    public function paginate(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $q = TransferOrder::where('company_id', $companyId)
            ->with(['fromBranch', 'toBranch', 'createdBy'])
            ->orderByDesc('created_at');

        if (!empty($filters['status'])) {
            $q->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $q->where(function ($sq) use ($filters) {
                $sq->where('transfer_number', 'ilike', "%{$filters['search']}%")
                   ->orWhereHas('fromBranch', fn ($b) => $b->where('name', 'ilike', "%{$filters['search']}%"))
                   ->orWhereHas('toBranch',   fn ($b) => $b->where('name', 'ilike', "%{$filters['search']}%"));
            });
        }

        return $q->paginate(20);
    }

    public function find(int $companyId, TransferOrder $to): TransferOrder
    {
        abort_if($to->company_id !== $companyId, 403);
        return $to->load(['fromBranch', 'toBranch', 'createdBy', 'items.product']);
    }

    public function create(int $companyId, int $userId, array $data): TransferOrder
    {
        return DB::transaction(function () use ($companyId, $userId, $data) {
            $items = $data['items'] ?? [];
            unset($data['items']);

            $to = TransferOrder::create(array_merge($data, [
                'company_id'      => $companyId,
                'created_by'      => $userId,
                'transfer_number' => $this->nextNumber($companyId),
                'status'          => 'draft',
            ]));

            foreach ($items as $item) {
                TransferOrderItem::create([
                    'transfer_order_id' => $to->id,
                    'product_id'        => $item['product_id'],
                    'quantity_requested' => $item['quantity'],
                    'quantity_sent'      => 0,
                    'quantity_received'  => 0,
                ]);
            }

            return $to->load(['fromBranch', 'toBranch', 'items.product']);
        });
    }

    public function dispatch(int $companyId, TransferOrder $to): TransferOrder
    {
        abort_if($to->company_id !== $companyId, 403);
        abort_if($to->status !== 'draft', 422, 'Only draft transfers can be dispatched.');

        return DB::transaction(function () use ($companyId, $to) {
            foreach ($to->items as $item) {
                $qty = $item->quantity_requested;

                $fromStock = StockLevel::firstOrCreate(
                    ['company_id' => $companyId, 'product_id' => $item->product_id, 'branch_id' => $to->from_branch_id],
                    ['quantity' => 0]
                );
                $before = $fromStock->quantity;
                $fromStock->decrement('quantity', $qty);

                InventoryMovement::create([
                    'company_id'      => $companyId,
                    'product_id'      => $item->product_id,
                    'branch_id'       => $to->from_branch_id,
                    'type'            => 'transfer_out',
                    'quantity'        => $qty,
                    'quantity_before' => $before,
                    'quantity_after'  => $before - $qty,
                    'reference'       => $to->transfer_number,
                    'notes'           => 'Transfer dispatched',
                    'user_id'         => auth()->id(),
                ]);

                $item->update(['quantity_sent' => $qty]);
            }

            $to->update(['status' => 'dispatched']);
            return $to->fresh()->load(['fromBranch', 'toBranch', 'items.product']);
        });
    }

    public function receive(int $companyId, TransferOrder $to): TransferOrder
    {
        abort_if($to->company_id !== $companyId, 403);
        abort_if($to->status !== 'dispatched', 422, 'Only dispatched transfers can be received.');

        return DB::transaction(function () use ($companyId, $to) {
            foreach ($to->items as $item) {
                $qty = $item->quantity_sent;

                $toStock = StockLevel::firstOrCreate(
                    ['company_id' => $companyId, 'product_id' => $item->product_id, 'branch_id' => $to->to_branch_id],
                    ['quantity' => 0]
                );
                $before = $toStock->quantity;
                $toStock->increment('quantity', $qty);

                InventoryMovement::create([
                    'company_id'      => $companyId,
                    'product_id'      => $item->product_id,
                    'branch_id'       => $to->to_branch_id,
                    'type'            => 'transfer_in',
                    'quantity'        => $qty,
                    'quantity_before' => $before,
                    'quantity_after'  => $before + $qty,
                    'reference'       => $to->transfer_number,
                    'notes'           => 'Transfer received',
                    'user_id'         => auth()->id(),
                ]);

                $item->update(['quantity_received' => $qty]);
            }

            $to->update(['status' => 'received', 'received_date' => now()]);
            return $to->fresh()->load(['fromBranch', 'toBranch', 'items.product']);
        });
    }

    public function cancel(int $companyId, TransferOrder $to): TransferOrder
    {
        abort_if($to->company_id !== $companyId, 403);
        abort_if(
            in_array($to->status, ['received', 'cancelled']),
            422,
            'Cannot cancel a ' . $to->status . ' transfer.'
        );

        if ($to->status === 'dispatched') {
            DB::transaction(function () use ($companyId, $to) {
                foreach ($to->items as $item) {
                    $qty = $item->quantity_sent;
                    if ($qty <= 0) continue;

                    $fromStock = StockLevel::where([
                        'company_id' => $companyId,
                        'product_id' => $item->product_id,
                        'branch_id'  => $to->from_branch_id,
                    ])->first();

                    if ($fromStock) {
                        $before = $fromStock->quantity;
                        $fromStock->increment('quantity', $qty);

                        InventoryMovement::create([
                            'company_id'      => $companyId,
                            'product_id'      => $item->product_id,
                            'branch_id'       => $to->from_branch_id,
                            'type'            => 'adjustment',
                            'quantity'        => $qty,
                            'quantity_before' => $before,
                            'quantity_after'  => $before + $qty,
                            'reference'       => $to->transfer_number,
                            'notes'           => 'Transfer cancelled — stock reversed',
                            'user_id'         => auth()->id(),
                        ]);
                    }
                }
            });
        }

        $to->update(['status' => 'cancelled']);
        return $to->fresh();
    }

    private function nextNumber(int $companyId): string
    {
        $count = TransferOrder::where('company_id', $companyId)->count() + 1;
        return 'TO-' . str_pad($count, 6, '0', STR_PAD_LEFT);
    }
}
