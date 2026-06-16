<?php

namespace App\Modules\Barcode\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Modules\Barcode\Services\BarcodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BarcodeController extends Controller
{
    public function __construct(private BarcodeService $service) {}

    public function assign(Request $request, int $id): JsonResponse
    {
        $product = Product::where('company_id', $request->user()->company_id)
            ->findOrFail($id);

        $product = $this->service->assign($request->user()->company_id, $product);

        return response()->json($product);
    }

    public function lookup(Request $request): JsonResponse
    {
        $request->validate(['barcode' => 'required|string']);

        $product = $this->service->lookup(
            $request->user()->company_id,
            $request->barcode
        );

        abort_if(!$product, 404, 'Product not found for barcode.');

        return response()->json($product->load('stockLevel'));
    }
}
