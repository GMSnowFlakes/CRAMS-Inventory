<?php

namespace App\Modules\PurchaseOrders\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Modules\PurchaseOrders\Requests\ReceivePurchaseOrderRequest;
use App\Modules\PurchaseOrders\Requests\StorePurchaseOrderRequest;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller
{
    public function __construct(private PurchaseOrderService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->paginate($request->user()->company_id, $request->only('status', 'supplier_id', 'search'))
        );
    }

    public function store(StorePurchaseOrderRequest $request): JsonResponse
    {
        $po = $this->service->create(
            $request->user()->company_id,
            $request->user()->id,
            $request->validated()
        );
        return response()->json($po, 201);
    }

    public function receive(ReceivePurchaseOrderRequest $request, int $id): JsonResponse
    {
        $po = PurchaseOrder::where('company_id', $request->user()->company_id)->findOrFail($id);
        return response()->json(
            $this->service->receive($request->user()->company_id, $po, $request->validated()['items'])
        );
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $po = PurchaseOrder::where('company_id', $request->user()->company_id)->findOrFail($id);
        return response()->json($this->service->cancel($po));
    }

    public function recordPayment(Request $request, int $id): JsonResponse
    {
        $po = PurchaseOrder::where('company_id', $request->user()->company_id)->findOrFail($id);
        $validated = $request->validate([
            'amount'         => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['nullable', 'string', 'in:cash,card,bank_transfer,gcash,check,other'],
            'reference'      => ['nullable', 'string', 'max:100'],
            'notes'          => ['nullable', 'string', 'max:500'],
        ]);
        return response()->json($this->service->recordPayment($po, $request->user()->id, $validated));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $po = PurchaseOrder::where('company_id', $request->user()->company_id)
            ->with(['items.product', 'supplier', 'branch', 'payments'])
            ->findOrFail($id);
        return response()->json($po);
    }
}
