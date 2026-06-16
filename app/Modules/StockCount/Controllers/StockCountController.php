<?php

namespace App\Modules\StockCount\Controllers;

use App\Http\Controllers\Controller;
use App\Models\StockCount;
use App\Modules\StockCount\Requests\StoreStockCountRequest;
use App\Modules\StockCount\Requests\UpdateCountItemsRequest;
use App\Modules\StockCount\Services\StockCountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockCountController extends Controller
{
    public function __construct(private StockCountService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->paginate($request->user()->company_id)
        );
    }

    public function store(StoreStockCountRequest $request): JsonResponse
    {
        $count = $this->service->create(
            $request->user()->company_id,
            $request->user()->id,
            $request->validated()
        );
        return response()->json($count, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $count = StockCount::where('company_id', $request->user()->company_id)
            ->with(['items.product', 'branch', 'createdBy'])
            ->findOrFail($id);
        return response()->json($count);
    }

    public function update(UpdateCountItemsRequest $request, int $id): JsonResponse
    {
        $count = StockCount::where('company_id', $request->user()->company_id)->findOrFail($id);
        return response()->json(
            $this->service->updateCounts($count, $request->validated()['items'])
        );
    }

    public function commit(Request $request, int $id): JsonResponse
    {
        $count = StockCount::where('company_id', $request->user()->company_id)
            ->with('items')
            ->findOrFail($id);
        return response()->json(
            $this->service->commit($request->user()->company_id, $count)
        );
    }
}
