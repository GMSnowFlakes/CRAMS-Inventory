<?php

namespace App\Modules\DnaScore\Services;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DnaScoreService
{
    public function scores(int $companyId): array
    {
        $products = DB::table('products')
            ->where('products.company_id', $companyId)
            ->select('products.id', 'products.name', 'products.sku', 'products.cost_price', 'products.selling_price', 'products.reorder_level')
            ->get();

        $thirtyDaysAgo = Carbon::now()->subDays(30)->toDateTimeString();

        // Current stock per product
        $stocks = DB::table('stock_levels')
            ->select('product_id', DB::raw('SUM(quantity) as total_stock'))
            ->groupBy('product_id')
            ->pluck('total_stock', 'product_id');

        // Units sold last 30 days (sale type)
        $unitsSoldMap = DB::table('inventory_movements')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->whereIn('type', ['sale', 'stock_out'])
            ->select('product_id', DB::raw('SUM(quantity) as units'))
            ->groupBy('product_id')
            ->pluck('units', 'product_id');

        // Avg units sold across all products (for velocity normalization)
        $allSalesValues = $unitsSoldMap->values()->toArray();
        $avgSalesAll = count($allSalesValues) > 0 ? array_sum($allSalesValues) / count($allSalesValues) : 1;

        $results = [];

        foreach ($products as $product) {
            $currentStock = (float) ($stocks[$product->id] ?? 0);
            $unitsSold    = (float) ($unitsSoldMap[$product->id] ?? 0);
            $costPrice    = (float) $product->cost_price;
            $sellingPrice = (float) $product->selling_price;
            $reorderLevel = (float) $product->reorder_level;

            // 1. Sales velocity (30%): ratio vs avg, capped at 100
            $velocityScore = $avgSalesAll > 0
                ? min(100, ($unitsSold / $avgSalesAll) * 100)
                : ($unitsSold > 0 ? 100 : 0);

            // 2. Stock turnover (25%): COGS / avg inventory value, normalized to 100 (cap at turnover=12/year → score=100)
            $avgInventoryValue = $currentStock * $costPrice;
            $cogs = $unitsSold * $costPrice;
            $turnover = $avgInventoryValue > 0 ? $cogs / $avgInventoryValue : 0;
            $turnoverScore = min(100, ($turnover / 12) * 100); // 12 turns/30-day period = 100

            // 3. Availability (20%): in stock = 100, out of stock = 0
            $availabilityScore = $currentStock > 0 ? 100 : 0;

            // 4. Margin contribution (15%): (selling - cost) / selling * 100
            $marginScore = $sellingPrice > 0
                ? max(0, (($sellingPrice - $costPrice) / $sellingPrice) * 100)
                : 0;

            // 5. Reorder compliance (10%): stock > reorder_level
            $reorderScore = $currentStock > $reorderLevel ? 100 : 0;

            $totalScore = round(
                ($velocityScore   * 0.30) +
                ($turnoverScore   * 0.25) +
                ($availabilityScore * 0.20) +
                ($marginScore     * 0.15) +
                ($reorderScore    * 0.10),
                1
            );

            $grade = match (true) {
                $totalScore >= 80 => 'A',
                $totalScore >= 60 => 'B',
                $totalScore >= 40 => 'C',
                default           => 'D',
            };

            $results[] = [
                'id'                => $product->id,
                'name'              => $product->name,
                'sku'               => $product->sku,
                'score'             => $totalScore,
                'grade'             => $grade,
                'velocity_score'    => round($velocityScore, 1),
                'turnover_score'    => round($turnoverScore, 1),
                'margin_pct'        => round($marginScore, 1),
                'availability_pct'  => round($availabilityScore, 1),
                'units_sold_30d'    => (int) $unitsSold,
                'current_stock'     => (int) $currentStock,
            ];
        }

        usort($results, fn($a, $b) => $b['score'] <=> $a['score']);

        $gradeCounts = ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0];
        foreach ($results as $r) {
            $gradeCounts[$r['grade']]++;
        }

        return ['grade_distribution' => $gradeCounts, 'products' => $results];
    }
}
