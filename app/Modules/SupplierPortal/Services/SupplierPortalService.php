<?php

namespace App\Modules\SupplierPortal\Services;

use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Modules\SupplierPortal\Models\SupplierPortalToken;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class SupplierPortalService
{
    public function generateToken(int $companyId, int $supplierId, string $label, ?string $expiresAt): SupplierPortalToken
    {
        return SupplierPortalToken::create([
            'company_id'  => $companyId,
            'supplier_id' => $supplierId,
            'token'       => Str::random(48),
            'label'       => $label,
            'expires_at'  => $expiresAt,
            'is_active'   => true,
        ]);
    }

    public function revokeToken(int $companyId, int $tokenId): void
    {
        SupplierPortalToken::where('company_id', $companyId)
            ->findOrFail($tokenId)
            ->update(['is_active' => false]);
    }

    public function listTokens(int $companyId, ?int $supplierId = null): Collection
    {
        $q = SupplierPortalToken::where('company_id', $companyId)
            ->with('supplier:id,name')
            ->orderByDesc('created_at');

        if ($supplierId) {
            $q->where('supplier_id', $supplierId);
        }

        return $q->get();
    }

    public function resolveToken(string $token): ?SupplierPortalToken
    {
        $record = SupplierPortalToken::where('token', $token)
            ->where('is_active', true)
            ->with('supplier')
            ->first();

        if (!$record) return null;
        if ($record->expires_at && $record->expires_at->isPast()) return null;

        $record->update(['last_accessed_at' => now()]);

        return $record;
    }

    public function portalPurchaseOrders(int $supplierId, int $companyId): Collection
    {
        return PurchaseOrder::where('company_id', $companyId)
            ->where('supplier_id', $supplierId)
            ->with(['items.product:id,name,sku'])
            ->orderByDesc('created_at')
            ->get(['id', 'po_number', 'status', 'subtotal', 'tax', 'total', 'created_at']);
    }
}
