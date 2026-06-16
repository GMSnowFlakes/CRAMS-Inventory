<?php

namespace App\Modules\Compliance\Services;

use App\Models\Product;
use App\Modules\Compliance\Models\ComplianceDocument;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ComplianceService
{
    public function expiryAlerts(int $companyId): array
    {
        $threshold = now()->addDays(30);

        $products = Product::where('company_id', $companyId)
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', $threshold)
            ->orderBy('expiry_date')
            ->get(['id', 'name', 'sku', 'expiry_date']);

        $documents = ComplianceDocument::where('company_id', $companyId)
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', $threshold)
            ->with('product:id,name')
            ->orderBy('expiry_date')
            ->get();

        return [
            'products'  => $products,
            'documents' => $documents,
        ];
    }

    public function documents(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $q = ComplianceDocument::where('company_id', $companyId)
            ->with('product:id,name,sku')
            ->orderByDesc('created_at');

        if (!empty($filters['document_type'])) {
            $q->where('document_type', $filters['document_type']);
        }
        if (!empty($filters['product_id'])) {
            $q->where('product_id', $filters['product_id']);
        }

        return $q->paginate(20);
    }

    public function store(int $companyId, array $data): ComplianceDocument
    {
        return ComplianceDocument::create(array_merge($data, ['company_id' => $companyId]));
    }

    public function update(int $companyId, int $id, array $data): ComplianceDocument
    {
        $doc = ComplianceDocument::where('company_id', $companyId)->findOrFail($id);
        $doc->update($data);
        return $doc->fresh('product');
    }

    public function destroy(int $companyId, int $id): void
    {
        ComplianceDocument::where('company_id', $companyId)->findOrFail($id)->delete();
    }
}
