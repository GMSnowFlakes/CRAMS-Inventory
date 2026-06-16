<?php

namespace App\Modules\TransferOrders\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TransferOrder;
use App\Modules\TransferOrders\Requests\StoreTransferOrderRequest;
use App\Modules\TransferOrders\Services\TransferOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferOrderController extends Controller
{
    public function __construct(private TransferOrderService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->paginate($request->user()->company_id, $request->only(['status', 'search']))
        );
    }

    public function store(StoreTransferOrderRequest $request): JsonResponse
    {
        $to = $this->service->create(
            $request->user()->company_id,
            $request->user()->id,
            $request->validated()
        );
        return response()->json($to, 201);
    }

    public function show(Request $request, TransferOrder $transferOrder): JsonResponse
    {
        return response()->json(
            $this->service->find($request->user()->company_id, $transferOrder)
        );
    }

    public function dispatch(Request $request, TransferOrder $transferOrder): JsonResponse
    {
        return response()->json(
            $this->service->dispatch($request->user()->company_id, $transferOrder)
        );
    }

    public function receive(Request $request, TransferOrder $transferOrder): JsonResponse
    {
        return response()->json(
            $this->service->receive($request->user()->company_id, $transferOrder)
        );
    }

    public function cancel(Request $request, TransferOrder $transferOrder): JsonResponse
    {
        return response()->json(
            $this->service->cancel($request->user()->company_id, $transferOrder)
        );
    }
}
