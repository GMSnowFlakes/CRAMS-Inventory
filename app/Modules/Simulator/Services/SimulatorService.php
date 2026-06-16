<?php

namespace App\Modules\Simulator\Services;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SimulatorService
{
    public function products(int $companyId): array
    {
        $products = DB::table('products')
            ->where('products.company_id', $companyId)
            ->select('products.id', 'products.name', 'products.sku', 'products.cost_price', 'products.selling_price', 'products.reorder_level')
            ->orderBy('products.name')
            ->get();

        $stocks = DB::table('stock_levels')
            ->select('product_id', DB::raw('SUM(quantity) as total_stock'))
            ->groupBy('product_id')
            ->pluck('total_stock', 'product_id');

        return $products->map(function ($p) use ($stocks) {
            return [
                'id'            => $p->id,
                'name'          => $p->name,
                'sku'           => $p->sku,
                'current_stock' => (int) ($stocks[$p->id] ?? 0),
                'cost_price'    => (float) $p->cost_price,
                'selling_price' => (float) $p->selling_price,
            ];
        })->toArray();
    }

    public function run(int $companyId, int $productId, int $orderQty): array
    {
        $product = DB::table('products')
            ->where('id', $productId)
            ->where('company_id', $companyId)
            ->first();

        if (!$product) {
            abort(404, 'Product not found');
        }

        $currentStock = (float) DB::table('stock_levels')
            ->where('product_id', $productId)
            ->sum('quantity');

        $thirtyDaysAgo = Carbon::now()->subDays(30)->toDateTimeString();
        $unitsSold = (float) DB::table('inventory_movements')
            ->where('product_id', $productId)
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->whereIn('type', ['sale', 'stock_out'])
            ->sum('quantity');

        $avgDailyUsage = $unitsSold / 30;

        $newStock = $currentStock + $orderQty;
        $daysCovered = $avgDailyUsage > 0 ? round($newStock / $avgDailyUsage, 1) : null;
        $projectedStockoutDate = $daysCovered !== null
            ? Carbon::today()->addDays((int) $daysCovered)->toDateString()
            : null;

        $totalCost         = $orderQty * (float) $product->cost_price;
        $revenuePotential  = $daysCovered !== null
            ? $daysCovered * $avgDailyUsage * (float) $product->selling_price
            : 0;

        return [
            'product'                => [
                'id'            => $product->id,
                'name'          => $product->name,
                'sku'           => $product->sku,
                'cost_price'    => (float) $product->cost_price,
                'selling_price' => (float) $product->selling_price,
            ],
            'current_stock'          => (int) $currentStock,
            'order_qty'              => $orderQty,
            'new_stock'              => (int) $newStock,
            'avg_daily_usage'        => round($avgDailyUsage, 4),
            'days_covered'           => $daysCovered,
            'projected_stockout_date'=> $projectedStockoutDate,
            'total_cost'             => round($totalCost, 2),
            'revenue_potential'      => round($revenuePotential, 2),
        ];
    }
}
