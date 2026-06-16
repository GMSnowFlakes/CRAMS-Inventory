<?php

namespace App\Modules\HealthScore\Services;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class HealthScoreService
{
    public function score(int $companyId): array
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30)->toDateTimeString();

        $totalProducts = DB::table('products')
            ->where('company_id', $companyId)
            ->count();

        if ($totalProducts === 0) {
            return $this->emptyScore();
        }

        $productIds = DB::table('products')
            ->where('company_id', $companyId)
            ->pluck('id');

        // 1. Stock availability (25%): % products with stock > 0
        $stockedCount = DB::table('stock_levels')
            ->whereIn('product_id', $productIds)
            ->select('product_id', DB::raw('SUM(quantity) as total'))
            ->groupBy('product_id')
            ->having('total', '>', 0)
            ->get()
            ->count();
        $availabilityScore = round(($stockedCount / $totalProducts) * 100, 1);

        // 2. Reorder compliance (20%): % products above reorder_level
        $productsWithReorder = DB::table('products as p')
            ->where('p.company_id', $companyId)
            ->join(DB::raw('(SELECT product_id, SUM(quantity) as total FROM stock_levels GROUP BY product_id) as sl'), 'sl.product_id', '=', 'p.id')
            ->whereColumn('sl.total', '>', 'p.reorder_level')
            ->count();
        $reorderScore = round(($productsWithReorder / $totalProducts) * 100, 1);

        // 3. Dead stock ratio (20%): products with no sales in 30 days
        $activeProductIds = DB::table('inventory_movements')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->whereIn('type', ['sale', 'stock_out'])
            ->whereIn('product_id', $productIds)
            ->distinct('product_id')
            ->pluck('product_id')
            ->unique();
        $deadStockCount = $totalProducts - $activeProductIds->count();
        $deadStockScore = round((1 - ($deadStockCount / $totalProducts)) * 100, 1);

        // 4. Sales velocity (20%): avg units/day last 30 days, normalized (target: 5 units/day = 100)
        $totalUnitsSold = DB::table('inventory_movements')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->whereIn('type', ['sale', 'stock_out'])
            ->whereIn('product_id', $productIds)
            ->sum('quantity');
        $avgUnitsPerDay = $totalUnitsSold / 30;
        $velocityScore  = min(100, round(($avgUnitsPerDay / max(1, $totalProducts * 0.5)) * 100, 1));

        // 5. Purchase order health (15%): % POs received within 7 days
        $totalPOs = DB::table('purchase_orders')
            ->where('company_id', $companyId)
            ->whereNotNull('received_at')
            ->count();
        $onTimePOs = 0;
        if ($totalPOs > 0) {
            $onTimePOs = DB::table('purchase_orders')
                ->where('company_id', $companyId)
                ->whereNotNull('received_at')
                ->whereRaw('DATEDIFF(received_at, created_at) <= 7')
                ->count();
        }
        $poHealthScore = $totalPOs > 0 ? round(($onTimePOs / $totalPOs) * 100, 1) : 50;

        $overallScore = round(
            ($availabilityScore * 0.25) +
            ($reorderScore      * 0.20) +
            ($deadStockScore    * 0.20) +
            ($velocityScore     * 0.20) +
            ($poHealthScore     * 0.15),
            1
        );

        $grade = match (true) {
            $overallScore >= 80 => 'A',
            $overallScore >= 60 => 'B',
            $overallScore >= 40 => 'C',
            default             => 'D',
        };

        return [
            'score' => $overallScore,
            'grade' => $grade,
            'breakdown' => [
                [
                    'key'         => 'stock_availability',
                    'label'       => 'Stock Availability',
                    'score'       => $availabilityScore,
                    'weight'      => 25,
                    'description' => "{$stockedCount} of {$totalProducts} products are in stock",
                ],
                [
                    'key'         => 'reorder_compliance',
                    'label'       => 'Reorder Compliance',
                    'score'       => $reorderScore,
                    'weight'      => 20,
                    'description' => "{$productsWithReorder} of {$totalProducts} products are above reorder level",
                ],
                [
                    'key'         => 'dead_stock_ratio',
                    'label'       => 'Dead Stock Ratio',
                    'score'       => $deadStockScore,
                    'weight'      => 20,
                    'description' => "{$deadStockCount} of {$totalProducts} products had no sales in 30 days",
                ],
                [
                    'key'         => 'sales_velocity',
                    'label'       => 'Sales Velocity',
                    'score'       => $velocityScore,
                    'weight'      => 20,
                    'description' => round($avgUnitsPerDay, 1) . " units sold per day on average",
                ],
                [
                    'key'         => 'po_health',
                    'label'       => 'Purchase Order Health',
                    'score'       => $poHealthScore,
                    'weight'      => 15,
                    'description' => $totalPOs > 0
                        ? "{$onTimePOs} of {$totalPOs} purchase orders received on time"
                        : "No completed purchase orders to evaluate",
                ],
            ],
        ];
    }

    private function emptyScore(): array
    {
        return [
            'score' => 0,
            'grade' => 'D',
            'breakdown' => [],
        ];
    }
}
