<?php

namespace App\Modules\Franchise\Services;

use App\Modules\Franchise\Models\FranchiseLink;
use Illuminate\Support\Facades\DB;

class FranchiseService
{
    public function isHQ(int $companyId): bool
    {
        return FranchiseLink::where('hq_company_id', $companyId)->exists();
    }

    public function franchises(int $companyId): array
    {
        $links = FranchiseLink::where('hq_company_id', $companyId)
            ->with('franchise:id,name')
            ->get();

        return $links->map(function ($link) {
            $fid = $link->franchise_company_id;

            $productCount = DB::table('products')
                ->where('company_id', $fid)
                ->where('is_active', true)
                ->count();

            $stockValue = DB::table('stock_levels')
                ->join('products', 'products.id', '=', 'stock_levels.product_id')
                ->where('products.company_id', $fid)
                ->sum(DB::raw('stock_levels.quantity * products.cost_price'));

            $lastActivity = DB::table('inventory_movements')
                ->where('company_id', $fid)
                ->max('created_at');

            return [
                'id'               => $link->id,
                'franchise_company_id' => $fid,
                'name'             => $link->franchise->name ?? 'Unknown',
                'label'            => $link->label,
                'is_active'        => $link->is_active,
                'product_count'    => (int) $productCount,
                'stock_value'      => (float) $stockValue,
                'last_activity'    => $lastActivity,
            ];
        })->toArray();
    }

    public function aggregateSummary(int $companyId): array
    {
        $franchiseIds = FranchiseLink::where('hq_company_id', $companyId)
            ->pluck('franchise_company_id');

        if ($franchiseIds->isEmpty()) {
            return [
                'is_hq'            => false,
                'total_revenue'    => 0,
                'total_stock_value'=> 0,
                'active_franchises'=> 0,
            ];
        }

        $totalRevenue = DB::table('sales')
            ->whereIn('company_id', $franchiseIds)
            ->whereIn('status', ['paid', 'partial', 'confirmed'])
            ->sum('total');

        $totalStockValue = DB::table('stock_levels')
            ->join('products', 'products.id', '=', 'stock_levels.product_id')
            ->whereIn('products.company_id', $franchiseIds)
            ->sum(DB::raw('stock_levels.quantity * products.cost_price'));

        $activeFranchises = FranchiseLink::where('hq_company_id', $companyId)
            ->where('is_active', true)
            ->count();

        return [
            'is_hq'             => true,
            'total_revenue'     => (float) $totalRevenue,
            'total_stock_value' => (float) $totalStockValue,
            'active_franchises' => (int) $activeFranchises,
        ];
    }

    public function addFranchise(int $hqCompanyId, int $franchiseCompanyId, string $label): FranchiseLink
    {
        return FranchiseLink::create([
            'hq_company_id'        => $hqCompanyId,
            'franchise_company_id' => $franchiseCompanyId,
            'label'                => $label,
            'is_active'            => true,
        ]);
    }

    public function removeFranchise(int $hqCompanyId, int $franchiseLinkId): bool
    {
        return FranchiseLink::where('id', $franchiseLinkId)
            ->where('hq_company_id', $hqCompanyId)
            ->delete() > 0;
    }
}
