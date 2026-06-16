<?php

namespace App\Modules\Recalls\Services;

use App\Mail\RecallNoticeAlert;
use App\Models\InventoryMovement;
use App\Models\User;
use App\Modules\Recalls\Models\RecallNotice;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class RecallService
{
    public function list(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $q = RecallNotice::where('company_id', $companyId)
            ->with(['product:id,name,sku', 'initiatedBy:id,name'])
            ->orderByDesc('created_at');

        if (!empty($filters['status'])) {
            $q->where('status', $filters['status']);
        }
        if (!empty($filters['severity'])) {
            $q->where('severity', $filters['severity']);
        }

        return $q->paginate(20);
    }

    public function create(int $companyId, int $userId, array $data): RecallNotice
    {
        return DB::transaction(function () use ($companyId, $userId, $data) {
            $recall = RecallNotice::create(array_merge($data, [
                'company_id'   => $companyId,
                'initiated_by' => $userId,
                'status'       => 'active',
            ]));

            // Log a quarantine stock movement
            InventoryMovement::create([
                'company_id'  => $companyId,
                'product_id'  => $data['product_id'],
                'type'        => 'adjustment',
                'quantity'    => -abs($data['affected_qty']),
                'notes'       => "Recall quarantine: {$data['title']}",
                'created_by'  => $userId,
            ]);

            $loaded = $recall->load(['product:id,name,sku', 'initiatedBy:id,name']);

            try {
                $recipients = User::where('company_id', $companyId)
                    ->whereIn('role', ['admin', 'manager'])
                    ->get();

                if ($recipients->isNotEmpty() && config('crams.mail_enabled')) {
                    Mail::to($recipients)->queue(new RecallNoticeAlert($loaded));
                }
            } catch (\Throwable) {
                // Mail failure must never break the main operation
            }

            return $loaded;
        });
    }

    public function resolve(int $companyId, int $id, ?string $notes, int $recoveredQty): RecallNotice
    {
        return DB::transaction(function () use ($companyId, $id, $notes, $recoveredQty) {
            $recall = RecallNotice::where('company_id', $companyId)->findOrFail($id);

            $recall->update([
                'status'        => 'resolved',
                'notes'         => $notes,
                'recovered_qty' => $recoveredQty,
                'resolved_at'   => now(),
            ]);

            return $recall->fresh(['product:id,name,sku', 'initiatedBy:id,name']);
        });
    }

    public function activeCount(int $companyId): int
    {
        return RecallNotice::where('company_id', $companyId)->where('status', 'active')->count();
    }
}
