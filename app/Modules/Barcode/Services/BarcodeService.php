<?php

namespace App\Modules\Barcode\Services;

use App\Models\Product;

class BarcodeService
{
    public function generate(int $companyId, int $productId): string
    {
        // EAN-13 style: company prefix (4 digits) + product id (7 digits) + check digit
        $base = str_pad($companyId, 4, '0', STR_PAD_LEFT)
              . str_pad($productId, 7, '0', STR_PAD_LEFT);

        return $base . $this->checkDigit($base);
    }

    public function assign(int $companyId, Product $product): Product
    {
        if ($product->barcode) {
            return $product;
        }

        $barcode = $this->generate($companyId, $product->id);

        // Ensure uniqueness by appending a suffix if collision
        $attempt = $barcode;
        $suffix  = 1;
        while (Product::where('barcode', $attempt)->exists()) {
            $attempt = substr($barcode, 0, 11) . str_pad($suffix++, 2, '0', STR_PAD_LEFT);
        }

        $product->update(['barcode' => $attempt]);

        return $product->fresh();
    }

    public function lookup(int $companyId, string $barcode): ?Product
    {
        return Product::where('company_id', $companyId)
            ->where('barcode', $barcode)
            ->first();
    }

    private function checkDigit(string $base): string
    {
        $sum = 0;
        foreach (str_split($base) as $i => $digit) {
            $sum += (int) $digit * ($i % 2 === 0 ? 1 : 3);
        }
        $check = (10 - ($sum % 10)) % 10;

        return (string) $check;
    }
}
