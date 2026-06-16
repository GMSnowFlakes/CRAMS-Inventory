<?php

namespace App\Modules\Products\Services;

use App\Models\Product;
use App\Services\IndustryKitService;
use App\Models\StockLevel;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class ProductService
{
    public function paginate(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $query = Product::with(['supplier', 'stockLevel'])
            ->where('company_id', $companyId);

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'ilike', "%{$filters['search']}%")
                  ->orWhere('sku', 'ilike', "%{$filters['search']}%");
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        return $query->orderBy('name')->paginate(20);
    }

    public function create(int $companyId, array $data): Product
    {
        $data['company_id'] = $companyId;
        $data['sku'] = $data['sku'] ?? $this->generateSku($data['name']);

        $product = Product::create($data);

        StockLevel::create([
            'company_id' => $companyId,
            'product_id' => $product->id,
            'quantity'   => 0,
        ]);

        return $product->load(['supplier', 'stockLevel']);
    }

    public function update(Product $product, array $data): Product
    {
        $product->update($data);

        return $product->fresh(['supplier', 'stockLevel']);
    }

    public function delete(Product $product): void
    {
        $product->delete();
    }

    public function categories(int $companyId): array
    {
        $existing = Product::where('company_id', $companyId)
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->toArray();

        $kit = IndustryKitService::forCompany($companyId);
        $suggestions = $kit['product_categories'] ?? [];

        return array_values(array_unique(array_merge($suggestions, $existing)));
    }

    private function generateSku(string $name): string
    {
        $base = strtoupper(Str::slug($name, ''));
        $base = substr($base, 0, 6);
        $suffix = strtoupper(Str::random(4));

        return "{$base}-{$suffix}";
    }
}
