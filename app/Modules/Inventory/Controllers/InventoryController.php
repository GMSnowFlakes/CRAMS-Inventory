<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Requests\AdjustmentRequest;
use App\Modules\Inventory\Requests\StockInRequest;
use App\Modules\Inventory\Requests\StockOutRequest;
use App\Modules\Inventory\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function __construct(private InventoryService $service) {}

    public function stockLevels(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $data = $this->service->stockLevels($companyId, $request->only(['search', 'low_stock']));

        return response()->json($data);
    }

    public function movements(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $data = $this->service->movements($companyId, $request->only(['product_id', 'type', 'from', 'to', 'branch_id']));

        return response()->json($data);
    }

    public function stockIn(StockInRequest $request): JsonResponse
    {
        $movement = $this->service->stockIn(
            $request->user()->company_id,
            $request->user()->id,
            $request->validated()
        );

        return response()->json($movement->load('product'), 201);
    }

    public function stockOut(StockOutRequest $request): JsonResponse
    {
        try {
            $movement = $this->service->stockOut(
                $request->user()->company_id,
                $request->user()->id,
                $request->validated()
            );

            return response()->json($movement->load('product'), 201);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function adjust(AdjustmentRequest $request): JsonResponse
    {
        $movement = $this->service->adjust(
            $request->user()->company_id,
            $request->user()->id,
            $request->validated()
        );

        return response()->json($movement->load('product'), 201);
    }
}
