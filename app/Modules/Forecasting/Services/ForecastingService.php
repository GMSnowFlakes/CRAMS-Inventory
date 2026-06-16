<?php

namespace App\Modules\Forecasting\Services;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ForecastingService
{
    public function forecast(int $companyId): array
    {
        $products = DB::table('products')
            ->where('products.company_id', $companyId)
            ->select('products.id', 'products.name', 'products.sku', 'products.reorder_level', 'products.cost_price', 'products.selling_price')
            ->get();

        $thirtyDaysAgo = Carbon::now()->subDays(30)->toDateTimeString();
        $today = Carbon::today();

        // Aggregate current stock per product
        $stocks = DB::table('stock_levels')
            ->select('product_id', DB::raw('SUM(quantity) as total_stock'))
            ->groupBy('product_id')
            ->pluck('total_stock', 'product_id');

        // Aggregate units sold (sale movements) in last 30 days
        $sales = DB::table('inventory_movements')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->whereIn('type', ['sale', 'stock_out'])
            ->select('product_id', DB::raw('SUM(quantity) as units_sold'))
            ->groupBy('product_id')
            ->pluck('units_sold', 'product_id');

        $results = [];

        foreach ($products as $product) {
            $currentStock = (float) ($stocks[$product->id] ?? 0);
            $unitsSold    = (float) ($sales[$product->id] ?? 0);
            $avgDailyUsage = round($unitsSold / 30, 4);

            $daysRemaining = null;
            $restockDate   = null;

            if ($avgDailyUsage > 0) {
                $daysRemaining = round($currentStock / $avgDailyUsage, 1);
                $restockDate   = $today->copy()->addDays((int) $daysRemaining)->toDateString();
            }

            $suggestedOrderQty = null;
            if ($avgDailyUsage > 0) {
                $qty = ($avgDailyUsage * 30) - $currentStock;
                $suggestedOrderQty = $qty > 0 ? (int) ceil($qty) : 0;
            }

            $riskLevel = 'stable';
            if ($daysRemaining !== null) {
                if ($daysRemaining < 7) {
                    $riskLevel = 'critical';
                } elseif ($daysRemaining <= 14) {
                    $riskLevel = 'warning';
                }
            } elseif ($currentStock <= 0) {
                $riskLevel = 'critical';
            }

            $results[] = [
                'id'                  => $product->id,
                'name'                => $product->name,
                'sku'                 => $product->sku,
                'current_stock'       => (int) $currentStock,
                'avg_daily_usage'     => $avgDailyUsage,
                'days_remaining'      => $daysRemaining,
                'restock_date'        => $restockDate,
                'suggested_order_qty' => $suggestedOrderQty,
                'risk_level'          => $riskLevel,
            ];
        }

        $summary = [
            'critical' => count(array_filter($results, fn($r) => $r['risk_level'] === 'critical')),
            'warning'  => count(array_filter($results, fn($r) => $r['risk_level'] === 'warning')),
            'stable'   => count(array_filter($results, fn($r) => $r['risk_level'] === 'stable')),
        ];

        usort($results, function ($a, $b) {
            $order = ['critical' => 0, 'warning' => 1, 'stable' => 2];
            return $order[$a['risk_level']] <=> $order[$b['risk_level']];
        });

        return ['summary' => $summary, 'products' => $results];
    }
}
