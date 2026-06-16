<?php

namespace App\Modules\POS\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Sales\Services\SaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class POSController extends Controller
{
    public function __construct(private SaleService $sales) {}

    /**
     * Quick-sale endpoint: creates and immediately confirms a sale in one step.
     * Designed for the POS screen where a cashier rings items and collects payment.
     */
    public function sale(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id'  => ['nullable', 'integer', 'exists:customers,id'],
            'branch_id'    => ['nullable', 'integer', 'exists:branches,id'],
            'sale_date'    => ['required', 'date'],
            'tax_rate'     => ['nullable', 'numeric', 'min:0', 'max:100'],
            'discount'     => ['nullable', 'numeric', 'min:0'],
            'amount_paid'  => ['required', 'numeric', 'min:0'],
            'notes'        => ['nullable', 'string', 'max:500'],
            'items'        => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'   => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount'   => ['nullable', 'numeric', 'min:0'],
        ]);

        $sale = $this->sales->create(
            $request->user()->company_id,
            $request->user()->id,
            array_merge($data, ['status' => 'confirmed'])
        );

        // Record the initial payment if amount_paid > 0
        if ($data['amount_paid'] > 0) {
            $this->sales->recordPayment($sale, $data['amount_paid']);
        }

        return response()->json($sale->load(['customer', 'items.product']), 201);
    }

    /**
     * Returns active products with stock levels for the POS product grid.
     */
    public function products(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $products = \App\Models\Product::where('company_id', $companyId)
            ->where('is_active', true)
            ->with(['stockLevel' => fn ($q) => $q->where('company_id', $companyId)])
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => [
                'id'            => $p->id,
                'name'          => $p->name,
                'sku'           => $p->sku,
                'category'      => $p->category,
                'unit'          => $p->unit,
                'selling_price' => (float) $p->selling_price,
                'cost_price'    => (float) $p->cost_price,
                'stock'         => (float) ($p->stockLevel?->quantity ?? 0),
            ]);

        return response()->json($products);
    }
}
