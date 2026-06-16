<?php

namespace App\Modules\Reports\Services;

use App\Models\Customer;
use App\Models\Expense;
use App\Models\InventoryMovement;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockLevel;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    public function inventorySummary(int $companyId): array
    {
        $totals = StockLevel::join('products', 'stock_levels.product_id', '=', 'products.id')
            ->where('stock_levels.company_id', $companyId)
            ->where('products.is_active', true)
            ->selectRaw('
                COUNT(*) as total_products,
                SUM(stock_levels.quantity) as total_units,
                SUM(stock_levels.quantity * products.cost_price) as total_value
            ')
            ->first();

        $lowStock = Product::where('company_id', $companyId)
            ->where('is_active', true)
            ->whereHas('stockLevel', function ($q) {
                $q->whereColumn('quantity', '<=', 'products.reorder_level');
            })
            ->count();

        $outOfStock = StockLevel::where('company_id', $companyId)
            ->where('quantity', 0)
            ->whereHas('product', fn ($q) => $q->where('is_active', true))
            ->count();

        return [
            'total_products' => (int) $totals->total_products,
            'total_units'    => (int) $totals->total_units,
            'total_value'    => round((float) $totals->total_value, 2),
            'low_stock'      => $lowStock,
            'out_of_stock'   => $outOfStock,
        ];
    }

    public function movementSummary(int $companyId, string $from, string $to): array
    {
        $movements = InventoryMovement::where('company_id', $companyId)
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->selectRaw('type, COUNT(*) as count, SUM(ABS(quantity)) as total_qty')
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        return [
            'stock_in'   => ['count' => (int) ($movements['stock_in']->count ?? 0),   'qty' => (int) ($movements['stock_in']->total_qty ?? 0)],
            'stock_out'  => ['count' => (int) ($movements['stock_out']->count ?? 0),  'qty' => (int) ($movements['stock_out']->total_qty ?? 0)],
            'adjustment' => ['count' => (int) ($movements['adjustment']->count ?? 0), 'qty' => (int) ($movements['adjustment']->total_qty ?? 0)],
        ];
    }

    public function topProducts(int $companyId, string $from, string $to, int $limit = 10): array
    {
        return InventoryMovement::where('company_id', $companyId)
            ->where('type', 'stock_out')
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->with('product:id,name,sku')
            ->selectRaw('product_id, SUM(quantity) as total_out')
            ->groupBy('product_id')
            ->orderByDesc('total_out')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'product'   => $row->product,
                'total_out' => (int) $row->total_out,
            ])
            ->toArray();
    }

    public function stockValuation(int $companyId): array
    {
        return StockLevel::join('products', 'stock_levels.product_id', '=', 'products.id')
            ->where('stock_levels.company_id', $companyId)
            ->where('products.is_active', true)
            ->where('stock_levels.quantity', '>', 0)
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.category',
                'stock_levels.quantity',
                'products.cost_price',
                DB::raw('stock_levels.quantity * products.cost_price as total_value'),
            ])
            ->orderByDesc('total_value')
            ->get()
            ->toArray();
    }

    public function reorderSuggestions(int $companyId): array
    {
        $lookback = 30;
        $since    = now()->subDays($lookback)->toDateString();

        $outflow = InventoryMovement::where('company_id', $companyId)
            ->where('type', 'stock_out')
            ->whereDate('created_at', '>=', $since)
            ->selectRaw('product_id, SUM(quantity) as total_out')
            ->groupBy('product_id')
            ->pluck('total_out', 'product_id');

        $rows = StockLevel::join('products', 'stock_levels.product_id', '=', 'products.id')
            ->where('stock_levels.company_id', $companyId)
            ->where('products.is_active', true)
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.category',
                'products.reorder_level',
                'products.cost_price',
                'stock_levels.quantity',
            ])
            ->get();

        $suggestions = [];

        foreach ($rows as $row) {
            $currentQty   = (float) $row->quantity;
            $reorderLevel = (float) ($row->reorder_level ?? 0);
            $totalOut     = (float) ($outflow[$row->id] ?? 0);
            $avgDailyOut  = $totalOut / $lookback;

            $daysRemaining = $avgDailyOut > 0
                ? floor($currentQty / $avgDailyOut)
                : ($currentQty > 0 ? 999 : 0);

            $needsReorder = $currentQty <= $reorderLevel || $daysRemaining < 14;
            if (!$needsReorder) continue;

            $suggestedQty = max(
                $reorderLevel * 2 - $currentQty,
                $avgDailyOut > 0 ? ceil($avgDailyOut * 30) : $reorderLevel
            );

            $urgency = match (true) {
                $currentQty === 0.0 => 'critical',
                $daysRemaining < 7  => 'high',
                $daysRemaining < 14 => 'medium',
                default             => 'low',
            };

            $suggestions[] = [
                'id'             => $row->id,
                'name'           => $row->name,
                'sku'            => $row->sku,
                'category'       => $row->category,
                'current_qty'    => (int) $currentQty,
                'reorder_level'  => (int) $reorderLevel,
                'avg_daily_out'  => round($avgDailyOut, 2),
                'days_remaining' => $daysRemaining === 999 ? null : (int) $daysRemaining,
                'suggested_qty'  => (int) max(1, $suggestedQty),
                'urgency'        => $urgency,
                'cost_estimate'  => round($suggestedQty * (float) $row->cost_price, 2),
            ];
        }

        usort($suggestions, function ($a, $b) {
            $order = ['critical' => 0, 'high' => 1, 'medium' => 2, 'low' => 3];
            return $order[$a['urgency']] <=> $order[$b['urgency']];
        });

        return $suggestions;
    }

    // ── Dead Stock ────────────────────────────────────────────────────────────

    public function deadStock(int $companyId, int $days = 60): array
    {
        $since = now()->subDays($days)->toDateString();

        $activeRows = StockLevel::join('products', 'stock_levels.product_id', '=', 'products.id')
            ->where('stock_levels.company_id', $companyId)
            ->where('products.is_active', true)
            ->where('stock_levels.quantity', '>', 0)
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.category',
                'products.cost_price',
                'products.selling_price',
                'stock_levels.quantity',
            ])
            ->get();

        $recentlyMoved = InventoryMovement::where('company_id', $companyId)
            ->whereDate('created_at', '>=', $since)
            ->pluck('product_id')
            ->unique()
            ->flip()
            ->toArray();

        $lastMovements = InventoryMovement::where('company_id', $companyId)
            ->selectRaw('product_id, MAX(created_at) as last_at')
            ->groupBy('product_id')
            ->pluck('last_at', 'product_id');

        $dead = [];
        foreach ($activeRows as $p) {
            if (isset($recentlyMoved[$p->id])) continue;

            $lastAt    = $lastMovements[$p->id] ?? null;
            $daysStale = $lastAt ? (int) now()->diffInDays(Carbon::parse($lastAt)) : null;

            $dead[] = [
                'id'               => $p->id,
                'name'             => $p->name,
                'sku'              => $p->sku,
                'category'         => $p->category,
                'quantity'         => (int) $p->quantity,
                'cost_price'       => (float) $p->cost_price,
                'selling_price'    => (float) $p->selling_price,
                'total_value'      => round((float) $p->quantity * (float) $p->cost_price, 2),
                'last_movement_at' => $lastAt,
                'days_stale'       => $daysStale,
            ];
        }

        usort($dead, fn ($a, $b) => ($b['days_stale'] ?? 99999) <=> ($a['days_stale'] ?? 99999));

        return $dead;
    }

    // ── Cash Flow Impact ──────────────────────────────────────────────────────

    public function cashFlowImpact(int $companyId): array
    {
        $totalValue = (float) StockLevel::join('products', 'stock_levels.product_id', '=', 'products.id')
            ->where('stock_levels.company_id', $companyId)
            ->where('products.is_active', true)
            ->sum(DB::raw('stock_levels.quantity * products.cost_price'));

        $deadItems      = $this->deadStock($companyId, 60);
        $deadStockValue = array_sum(array_column($deadItems, 'total_value'));

        $reorder             = $this->reorderSuggestions($companyId);
        $reorderCostTotal    = array_sum(array_column($reorder, 'cost_estimate'));
        $reorderCostUrgent   = array_sum(
            array_column(
                array_filter($reorder, fn ($r) => in_array($r['urgency'], ['critical', 'high'])),
                'cost_estimate'
            )
        );

        // Estimated revenue at risk from out-of-stock (reorder_level × selling_price)
        $revenueAtRisk = (float) StockLevel::join('products', 'stock_levels.product_id', '=', 'products.id')
            ->where('stock_levels.company_id', $companyId)
            ->where('products.is_active', true)
            ->where('stock_levels.quantity', 0)
            ->sum(DB::raw('products.reorder_level * products.selling_price'));

        return [
            'total_inventory_value'       => round($totalValue, 2),
            'liquid_value'                => round($totalValue - $deadStockValue, 2),
            'dead_stock_value'            => round($deadStockValue, 2),
            'dead_stock_count'            => count($deadItems),
            'reorder_cost_total'          => round($reorderCostTotal, 2),
            'reorder_cost_urgent'         => round($reorderCostUrgent, 2),
            'out_of_stock_revenue_at_risk'=> round($revenueAtRisk, 2),
        ];
    }

    // ── Inventory Timeline ────────────────────────────────────────────────────

    public function inventoryTimeline(int $companyId, string $from, string $to): array
    {
        $rows = InventoryMovement::where('company_id', $companyId)
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->selectRaw("DATE(created_at) as date, type, SUM(ABS(quantity)) as total")
            ->groupBy(DB::raw('DATE(created_at)'), 'type')
            ->orderBy('date')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $d = $row->date;
            if (!isset($map[$d])) {
                $map[$d] = ['date' => $d, 'stock_in' => 0, 'stock_out' => 0, 'adjustment' => 0];
            }
            if ($row->type === 'stock_in')   $map[$d]['stock_in']   = (int) $row->total;
            if ($row->type === 'stock_out')  $map[$d]['stock_out']  = (int) $row->total;
            if ($row->type === 'adjustment') $map[$d]['adjustment'] = (int) $row->total;
        }

        return array_values($map);
    }

    // ── Insights Engine ───────────────────────────────────────────────────────

    public function insights(int $companyId): array
    {
        $summary   = $this->inventorySummary($companyId);
        $reorder   = $this->reorderSuggestions($companyId);
        $deadItems = $this->deadStock($companyId, 60);
        $cashFlow  = $this->cashFlowImpact($companyId);

        $insights = [];

        if ($summary['out_of_stock'] > 0) {
            $insights[] = [
                'type'     => 'critical',
                'category' => 'Stock',
                'title'    => "{$summary['out_of_stock']} product(s) completely out of stock",
                'detail'   => 'Customers cannot be served for these items. Immediate restocking required.',
                'metric'   => '$' . number_format($cashFlow['out_of_stock_revenue_at_risk'], 2) . ' revenue at risk',
            ];
        }

        $urgentCount = count(array_filter($reorder, fn ($r) => in_array($r['urgency'], ['critical', 'high'])));
        if ($urgentCount > 0) {
            $insights[] = [
                'type'     => 'warning',
                'category' => 'Reorder',
                'title'    => "{$urgentCount} product(s) will run out within 7 days",
                'detail'   => 'Based on current usage rates, these items need restocking now.',
                'metric'   => '$' . number_format($cashFlow['reorder_cost_urgent'], 2) . ' to reorder',
            ];
        }

        if (count($deadItems) > 0) {
            $insights[] = [
                'type'     => 'warning',
                'category' => 'Dead Stock',
                'title'    => count($deadItems) . ' product(s) with no movement in 60+ days',
                'detail'   => 'Consider promotions, price reductions, or returns to supplier.',
                'metric'   => '$' . number_format($cashFlow['dead_stock_value'], 2) . ' tied up',
            ];
        }

        $mediumCount = count(array_filter($reorder, fn ($r) => $r['urgency'] === 'medium'));
        if ($mediumCount > 0) {
            $insights[] = [
                'type'     => 'info',
                'category' => 'Planning',
                'title'    => "{$mediumCount} product(s) approaching reorder level",
                'detail'   => 'These items have 7–14 days of stock remaining. Plan orders now.',
                'metric'   => null,
            ];
        }

        if ($cashFlow['dead_stock_value'] > $cashFlow['total_inventory_value'] * 0.15) {
            $pct = round($cashFlow['dead_stock_value'] / max(1, $cashFlow['total_inventory_value']) * 100);
            $insights[] = [
                'type'     => 'info',
                'category' => 'Efficiency',
                'title'    => "{$pct}% of inventory value is idle capital",
                'detail'   => 'Dead stock exceeds 15% of total inventory value. Review purchasing strategy.',
                'metric'   => null,
            ];
        }

        if (empty($insights)) {
            $insights[] = [
                'type'     => 'success',
                'category' => 'Health',
                'title'    => 'Inventory is in excellent shape',
                'detail'   => 'All products are stocked and moving. No action required.',
                'metric'   => null,
            ];
        }

        return $insights;
    }

    // ── Health Score Breakdown ────────────────────────────────────────────────

    public function healthScoreBreakdown(int $companyId): array
    {
        $summary   = $this->inventorySummary($companyId);
        $deadItems = $this->deadStock($companyId, 60);

        $total      = max(1, $summary['total_products']);
        $outPct     = $summary['out_of_stock'] / $total;
        $lowOnlyPct = max(0, ($summary['low_stock'] - $summary['out_of_stock'])) / $total;
        $deadPct    = count($deadItems) / $total;

        $outPenalty  = round($outPct * 50, 1);
        $lowPenalty  = round($lowOnlyPct * 25, 1);
        $deadPenalty = round($deadPct * 10, 1);
        $score       = (int) max(0, min(100, round(100 - $outPenalty - $lowPenalty - $deadPenalty)));

        $grade = match (true) {
            $score >= 90 => ['label' => 'Excellent', 'color' => 'green'],
            $score >= 75 => ['label' => 'Good',      'color' => 'sky'],
            $score >= 50 => ['label' => 'Fair',       'color' => 'amber'],
            default      => ['label' => 'At Risk',   'color' => 'red'],
        };

        return [
            'score' => $score,
            'grade' => $grade,
            'breakdown' => [
                [
                    'label'       => 'Out of Stock',
                    'description' => "{$summary['out_of_stock']} product(s) with zero quantity",
                    'penalty'     => $outPenalty,
                    'max_penalty' => 50,
                    'color'       => 'red',
                ],
                [
                    'label'       => 'Low Stock',
                    'description' => max(0, $summary['low_stock'] - $summary['out_of_stock']) . ' product(s) below reorder level',
                    'penalty'     => $lowPenalty,
                    'max_penalty' => 25,
                    'color'       => 'amber',
                ],
                [
                    'label'       => 'Dead Stock',
                    'description' => count($deadItems) . ' product(s) with no movement in 60+ days',
                    'penalty'     => $deadPenalty,
                    'max_penalty' => 10,
                    'color'       => 'violet',
                ],
            ],
            'total_penalty' => round($outPenalty + $lowPenalty + $deadPenalty, 1),
            'total_products'=> $summary['total_products'],
        ];
    }

    // ── Sales Reports ─────────────────────────────────────────────────────────

    public function salesSummary(int $companyId, string $from, string $to): array
    {
        $base = Sale::where('company_id', $companyId)
            ->whereNotIn('status', ['cancelled', 'draft'])
            ->whereBetween('sale_date', [$from, $to]);

        $totals = (clone $base)
            ->selectRaw('COUNT(*) as invoice_count, SUM(total) as revenue, SUM(amount_paid) as collected, SUM(total - amount_paid) as outstanding, SUM(tax) as tax_collected, SUM(discount) as discounts_given')
            ->first();

        $byStatus = Sale::where('company_id', $companyId)
            ->whereBetween('sale_date', [$from, $to])
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return [
            'invoice_count'    => (int)   ($totals->invoice_count  ?? 0),
            'revenue'          => round((float) ($totals->revenue          ?? 0), 2),
            'collected'        => round((float) ($totals->collected        ?? 0), 2),
            'outstanding'      => round((float) ($totals->outstanding      ?? 0), 2),
            'tax_collected'    => round((float) ($totals->tax_collected    ?? 0), 2),
            'discounts_given'  => round((float) ($totals->discounts_given  ?? 0), 2),
            'by_status'        => $byStatus->map(fn ($r) => (int) $r->count)->toArray(),
        ];
    }

    public function salesByPeriod(int $companyId, string $from, string $to): array
    {
        $rows = Sale::where('company_id', $companyId)
            ->whereNotIn('status', ['cancelled', 'draft'])
            ->whereBetween('sale_date', [$from, $to])
            ->selectRaw('sale_date as date, SUM(total) as revenue, SUM(amount_paid) as collected, COUNT(*) as invoices')
            ->groupBy('sale_date')
            ->orderBy('sale_date')
            ->get();

        return $rows->map(fn ($r) => [
            'date'      => $r->date,
            'revenue'   => round((float) $r->revenue,   2),
            'collected' => round((float) $r->collected, 2),
            'invoices'  => (int) $r->invoices,
        ])->toArray();
    }

    public function topCustomers(int $companyId, string $from, string $to, int $limit = 10): array
    {
        return Sale::where('company_id', $companyId)
            ->whereNotIn('status', ['cancelled', 'draft'])
            ->whereBetween('sale_date', [$from, $to])
            ->whereNotNull('customer_id')
            ->with('customer:id,name,email,phone')
            ->selectRaw('customer_id, COUNT(*) as invoice_count, SUM(total) as revenue, SUM(amount_paid) as collected')
            ->groupBy('customer_id')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => [
                'customer'      => $r->customer,
                'invoice_count' => (int)   $r->invoice_count,
                'revenue'       => round((float) $r->revenue,   2),
                'collected'     => round((float) $r->collected, 2),
                'outstanding'   => round((float) $r->revenue - (float) $r->collected, 2),
            ])
            ->toArray();
    }

    public function topSellingProducts(int $companyId, string $from, string $to, int $limit = 10): array
    {
        return SaleItem::whereHas('sale', fn ($q) => $q
                ->where('company_id', $companyId)
                ->whereNotIn('status', ['cancelled', 'draft'])
                ->whereBetween('sale_date', [$from, $to])
            )
            ->with('product:id,name,sku,unit,cost_price')
            ->selectRaw('product_id, SUM(quantity) as qty_sold, SUM(total) as revenue, SUM(quantity * unit_price) as gross')
            ->groupBy('product_id')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => [
                'product'    => $r->product,
                'qty_sold'   => round((float) $r->qty_sold, 2),
                'revenue'    => round((float) $r->revenue,  2),
                'avg_price'  => $r->qty_sold > 0 ? round((float) $r->revenue / (float) $r->qty_sold, 2) : 0,
            ])
            ->toArray();
    }

    public function profitLoss(int $companyId, string $from, string $to): array
    {
        // Revenue = sum of confirmed/partial/paid sale totals
        $revenue = (float) Sale::where('company_id', $companyId)
            ->whereNotIn('status', ['cancelled', 'draft'])
            ->whereBetween('sale_date', [$from, $to])
            ->sum('total');

        // COGS = stock_out movements in date range × unit_cost recorded at time of movement
        $cogs = (float) InventoryMovement::where('company_id', $companyId)
            ->where('type', 'stock_out')
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->whereNotNull('unit_cost')
            ->sum(DB::raw('ABS(quantity) * unit_cost'));

        // If unit_cost not recorded, fallback: join products cost_price
        if ($cogs == 0) {
            $cogs = (float) SaleItem::whereHas('sale', fn ($q) => $q
                    ->where('company_id', $companyId)
                    ->whereNotIn('status', ['cancelled', 'draft'])
                    ->whereBetween('sale_date', [$from, $to])
                )
                ->join('products', 'sale_items.product_id', '=', 'products.id')
                ->sum(DB::raw('sale_items.quantity * products.cost_price'));
        }

        $grossProfit = $revenue - $cogs;
        $margin      = $revenue > 0 ? round($grossProfit / $revenue * 100, 2) : 0;

        // Purchases made during period
        $purchases = (float) DB::table('purchase_order_items')
            ->join('purchase_orders', 'purchase_order_items.purchase_order_id', '=', 'purchase_orders.id')
            ->where('purchase_orders.company_id', $companyId)
            ->whereIn('purchase_orders.status', ['received', 'partial'])
            ->whereBetween('purchase_orders.order_date', [$from, $to])
            ->sum(DB::raw('purchase_order_items.quantity * purchase_order_items.unit_cost'));

        return [
            'revenue'       => round($revenue, 2),
            'cogs'          => round($cogs, 2),
            'gross_profit'  => round($grossProfit, 2),
            'gross_margin'  => $margin,
            'purchases'     => round($purchases, 2),
            'net_position'  => round($grossProfit - $purchases, 2),
        ];
    }

    // ── Overdue Sales ─────────────────────────────────────────────────────────

    public function overdueSales(int $companyId): array
    {
        $rows = Sale::where('company_id', $companyId)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', today())
            ->whereNotIn('status', ['paid', 'cancelled'])
            ->with('customer:id,name')
            ->orderBy('due_date')
            ->get(['id', 'invoice_number', 'status', 'sale_date', 'due_date', 'total', 'amount_paid', 'customer_id']);

        return [
            'count' => $rows->count(),
            'total_outstanding' => round($rows->sum(fn ($s) => $s->total - $s->amount_paid), 2),
            'sales' => $rows->map(fn ($s) => [
                'id'             => $s->id,
                'invoice_number' => $s->invoice_number,
                'status'         => $s->status,
                'sale_date'      => $s->sale_date?->toDateString(),
                'due_date'       => $s->due_date?->toDateString(),
                'total'          => (float) $s->total,
                'amount_paid'    => (float) $s->amount_paid,
                'balance'        => round($s->total - $s->amount_paid, 2),
                'customer'       => $s->customer ? ['id' => $s->customer->id, 'name' => $s->customer->name] : null,
                'days_overdue'   => (int) now()->diffInDays($s->due_date, false) * -1,
            ])->values()->toArray(),
        ];
    }

    // ── Expenses Report ───────────────────────────────────────────────────────

    public function expenseSummary(int $companyId, string $from, string $to): array
    {
        $rows = Expense::where('company_id', $companyId)
            ->whereBetween('expense_date', [$from, $to])
            ->selectRaw('category, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('category')
            ->orderByDesc('total')
            ->get();

        $total = $rows->sum('total');

        $byMethod = Expense::where('company_id', $companyId)
            ->whereBetween('expense_date', [$from, $to])
            ->selectRaw('payment_method, SUM(amount) as total')
            ->groupBy('payment_method')
            ->pluck('total', 'payment_method');

        return [
            'total'      => round($total, 2),
            'count'      => (int) $rows->sum('count'),
            'by_category' => $rows->map(fn ($r) => [
                'category' => $r->category,
                'total'    => round((float) $r->total, 2),
                'count'    => (int) $r->count,
                'pct'      => $total > 0 ? round($r->total / $total * 100, 1) : 0,
            ])->values()->toArray(),
            'by_method' => $byMethod->map(fn ($v) => round((float) $v, 2))->toArray(),
        ];
    }

    // ── Customer Statement ────────────────────────────────────────────────────

    public function customerStatement(int $companyId, int $customerId): array
    {
        $customer = Customer::where('company_id', $companyId)->findOrFail($customerId);

        $sales = Sale::where('company_id', $companyId)
            ->where('customer_id', $customerId)
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('sale_date')
            ->get(['id', 'invoice_number', 'status', 'sale_date', 'due_date', 'total', 'amount_paid']);

        $totalBilled    = $sales->sum('total');
        $totalPaid      = $sales->sum('amount_paid');
        $totalOutstanding = $totalBilled - $totalPaid;

        return [
            'customer'          => ['id' => $customer->id, 'name' => $customer->name, 'email' => $customer->email, 'phone' => $customer->phone],
            'total_billed'      => round($totalBilled, 2),
            'total_paid'        => round($totalPaid, 2),
            'total_outstanding' => round($totalOutstanding, 2),
            'invoice_count'     => $sales->count(),
            'invoices'          => $sales->map(fn ($s) => [
                'id'             => $s->id,
                'invoice_number' => $s->invoice_number,
                'status'         => $s->status,
                'sale_date'      => $s->sale_date?->toDateString(),
                'due_date'       => $s->due_date?->toDateString(),
                'total'          => (float) $s->total,
                'amount_paid'    => (float) $s->amount_paid,
                'balance'        => round($s->total - $s->amount_paid, 2),
            ])->values()->toArray(),
        ];
    }

    // ── Export Data ───────────────────────────────────────────────────────────

    public function exportInventory(int $companyId): array
    {
        return StockLevel::join('products', 'stock_levels.product_id', '=', 'products.id')
            ->where('stock_levels.company_id', $companyId)
            ->select([
                'products.name', 'products.sku', 'products.category',
                'products.cost_price', 'products.selling_price',
                'stock_levels.quantity',
                DB::raw('stock_levels.quantity * products.cost_price as stock_value'),
                'products.reorder_level',
            ])
            ->orderBy('products.name')
            ->get()
            ->map(fn ($r) => [
                'Name'          => $r->name,
                'SKU'           => $r->sku,
                'Category'      => $r->category ?? '',
                'Cost Price'    => $r->cost_price,
                'Selling Price' => $r->selling_price,
                'Quantity'      => $r->quantity,
                'Stock Value'   => round($r->stock_value, 2),
                'Reorder Level' => $r->reorder_level,
            ])
            ->toArray();
    }

    public function supplierStatement(int $companyId, int $supplierId): array
    {
        $supplier = Supplier::where('company_id', $companyId)->findOrFail($supplierId);

        $pos = PurchaseOrder::where('company_id', $companyId)
            ->where('supplier_id', $supplierId)
            ->whereNotIn('status', ['cancelled'])
            ->with('payments')
            ->orderBy('order_date', 'desc')
            ->get();

        $totalOrdered  = $pos->sum('total');
        $totalPaid     = $pos->sum('amount_paid');
        $totalOwing    = max(0, $totalOrdered - $totalPaid);

        return [
            'supplier'       => ['id' => $supplier->id, 'name' => $supplier->name, 'email' => $supplier->email, 'phone' => $supplier->phone],
            'total_ordered'  => round($totalOrdered, 2),
            'total_paid'     => round($totalPaid, 2),
            'total_owing'    => round($totalOwing, 2),
            'po_count'       => $pos->count(),
            'purchase_orders' => $pos->map(fn ($po) => [
                'id'           => $po->id,
                'po_number'    => $po->po_number,
                'order_date'   => $po->order_date?->toDateString(),
                'status'       => $po->status,
                'total' => (float) $po->total,
                'amount_paid'  => (float) $po->amount_paid,
                'balance'      => round($po->total - $po->amount_paid, 2),
            ])->toArray(),
        ];
    }

    public function lowStockAlerts(int $companyId): array
    {
        $items = StockLevel::join('products', 'stock_levels.product_id', '=', 'products.id')
            ->where('products.company_id', $companyId)
            ->where('products.is_active', true)
            ->whereColumn('stock_levels.quantity', '<=', 'products.reorder_level')
            ->where('products.reorder_level', '>', 0)
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.category',
                'products.reorder_level',
                'stock_levels.quantity',
                DB::raw('products.reorder_level - stock_levels.quantity as units_below'),
            ])
            ->orderByRaw('stock_levels.quantity - products.reorder_level ASC')
            ->get()
            ->toArray();

        return [
            'count' => count($items),
            'items' => $items,
        ];
    }

    public function exportSales(int $companyId, string $from, string $to): array
    {
        return Sale::where('company_id', $companyId)
            ->whereBetween('sale_date', [$from, $to])
            ->with('customer:id,name')
            ->orderBy('sale_date')
            ->get()
            ->map(fn ($s) => [
                'Invoice'      => $s->invoice_number,
                'Date'         => $s->sale_date?->toDateString(),
                'Due Date'     => $s->due_date?->toDateString() ?? '',
                'Customer'     => $s->customer?->name ?? 'Walk-in',
                'Status'       => $s->status,
                'Subtotal'     => (float) $s->subtotal,
                'Discount'     => (float) $s->discount,
                'Tax'          => (float) $s->tax,
                'Total'        => (float) $s->total,
                'Amount Paid'  => (float) $s->amount_paid,
                'Balance'      => round($s->total - $s->amount_paid, 2),
            ])
            ->toArray();
    }

    public function exportExpenses(int $companyId, string $from, string $to): array
    {
        return Expense::where('company_id', $companyId)
            ->whereBetween('expense_date', [$from, $to])
            ->orderBy('expense_date')
            ->get()
            ->map(fn ($e) => [
                'Date'           => $e->expense_date?->toDateString(),
                'Category'       => $e->category,
                'Description'    => $e->description ?? '',
                'Amount'         => (float) $e->amount,
                'Payment Method' => $e->payment_method,
                'Reference'      => $e->reference ?? '',
                'Notes'          => $e->notes ?? '',
            ])
            ->toArray();
    }

    public function exportMovements(int $companyId, array $filters = []): array
    {
        $query = InventoryMovement::where('company_id', $companyId)
            ->with(['product:id,name,sku', 'user:id,name']);

        if (!empty($filters['from'])) {
            $query->whereDate('created_at', '>=', $filters['from']);
        }
        if (!empty($filters['to'])) {
            $query->whereDate('created_at', '<=', $filters['to']);
        }
        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
        }

        return $query->orderByDesc('created_at')
            ->get()
            ->map(fn ($m) => [
                'Date'      => $m->created_at?->toDateTimeString(),
                'Product'   => $m->product?->name ?? '',
                'SKU'       => $m->product?->sku ?? '',
                'Type'      => $m->type,
                'Quantity'  => $m->quantity,
                'Before'    => $m->quantity_before,
                'After'     => $m->quantity_after,
                'Reference' => $m->reference ?? '',
                'Notes'     => $m->notes ?? '',
                'User'      => $m->user?->name ?? '',
            ])
            ->toArray();
    }
}
