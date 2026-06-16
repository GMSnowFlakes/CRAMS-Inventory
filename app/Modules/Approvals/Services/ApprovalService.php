<?php

namespace App\Modules\Approvals\Services;

use App\Mail\ApprovalDecided;
use App\Mail\ApprovalRequested;
use App\Models\User;
use App\Modules\Approvals\Models\ApprovalRequest;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ApprovalService
{
    public function requestApproval(int $companyId, string $approvableType, int $approvableId, int $requestedBy): ApprovalRequest
    {
        $approval = ApprovalRequest::create([
            'company_id'       => $companyId,
            'approvable_type'  => $approvableType,
            'approvable_id'    => $approvableId,
            'requested_by'     => $requestedBy,
            'status'           => 'pending',
        ]);

        try {
            $requester  = User::find($requestedBy);
            $recipients = User::where('company_id', $companyId)
                ->whereIn('role', ['admin', 'manager'])
                ->get();

            if ($recipients->isNotEmpty()) {
                $type      = class_basename($approvableType);
                $refId     = "#{$approvableId}";
                $requesterName = $requester?->name ?? "User #{$requestedBy}";

                if (config('crams.mail_enabled')) {
                    Mail::to($recipients)->queue(new ApprovalRequested($type, $refId, $requesterName));
                }
            }
        } catch (\Throwable) {
            // Mail failure must never break the main operation
        }

        return $approval;
    }

    public function approve(int $companyId, int $approvalId, int $approverId, ?string $notes): ApprovalRequest
    {
        $approval = ApprovalRequest::where('company_id', $companyId)->findOrFail($approvalId);

        $approval->update([
            'status'      => 'approved',
            'approver_id' => $approverId,
            'notes'       => $notes,
            'decided_at'  => now(),
        ]);

        $fresh = $approval->fresh(['requestedBy', 'approver']);
        $this->dispatchDecisionEmail($fresh, 'approved');
        return $fresh;
    }

    public function reject(int $companyId, int $approvalId, int $approverId, ?string $notes): ApprovalRequest
    {
        $approval = ApprovalRequest::where('company_id', $companyId)->findOrFail($approvalId);

        $approval->update([
            'status'      => 'rejected',
            'approver_id' => $approverId,
            'notes'       => $notes,
            'decided_at'  => now(),
        ]);

        $fresh = $approval->fresh(['requestedBy', 'approver']);
        $this->dispatchDecisionEmail($fresh, 'rejected');
        return $fresh;
    }

    private function dispatchDecisionEmail(ApprovalRequest $approval, string $decision): void
    {
        if (!config('crams.mail_enabled')) {
            return;
        }
        try {
            $requester = $approval->requestedBy;
            if (!$requester) {
                return;
            }

            $type        = class_basename($approval->approvable_type);
            $refId       = "#{$approval->approvable_id}";
            $approverName= $approval->approver?->name ?? 'System';
            $resourceUrl = config('app.url') . '/approvals';

            Mail::to($requester)->queue(new ApprovalDecided(
                $decision,
                $type,
                $refId,
                $approverName,
                $approval->notes,
                $resourceUrl,
            ));
        } catch (\Throwable) {
            // Mail failure must never break the main operation
        }
    }

    public function pendingForCompany(int $companyId): Collection
    {
        return ApprovalRequest::where('company_id', $companyId)
            ->where('status', 'pending')
            ->with(['requestedBy', 'approvable'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($approval) {
                $resource = null;
                if ($approval->approvable) {
                    $resource = [
                        'id'     => $approval->approvable->id,
                        'label'  => $approval->approvable->po_number
                                    ?? $approval->approvable->transfer_number
                                    ?? "#{$approval->approvable->id}",
                        'status' => $approval->approvable->status ?? null,
                    ];
                }
                return array_merge($approval->toArray(), ['resource' => $resource]);
            });
    }

    public function historyForCompany(int $companyId, int $perPage = 20)
    {
        return ApprovalRequest::where('company_id', $companyId)
            ->whereIn('status', ['approved', 'rejected'])
            ->with(['requestedBy', 'approver', 'approvable'])
            ->orderByDesc('decided_at')
            ->paginate($perPage);
    }
}
