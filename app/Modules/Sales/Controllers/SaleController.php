<?php

namespace App\Modules\Sales\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Modules\Sales\Requests\RecordPaymentRequest;
use App\Modules\Sales\Requests\StoreSaleRequest;
use App\Modules\Sales\Services\SaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function __construct(private SaleService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->paginate($request->user()->company_id, $request->only('status', 'customer_id', 'search'))
        );
    }

    public function store(StoreSaleRequest $request): JsonResponse
    {
        $sale = $this->service->create(
            $request->user()->company_id,
            $request->user()->id,
            $request->validated()
        );
        return response()->json($sale, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $sale = Sale::where('company_id', $request->user()->company_id)
            ->with(['items.product', 'customer', 'branch', 'createdBy', 'payments'])
            ->findOrFail($id);
        return response()->json($sale);
    }

    public function confirm(Request $request, int $id): JsonResponse
    {
        $sale = Sale::where('company_id', $request->user()->company_id)->findOrFail($id);
        return response()->json($this->service->confirm($request->user()->company_id, $sale));
    }

    public function recordPayment(RecordPaymentRequest $request, int $id): JsonResponse
    {
        $sale      = Sale::where('company_id', $request->user()->company_id)->findOrFail($id);
        $validated = $request->validated();
        return response()->json($this->service->recordPayment(
            $sale,
            (float) $validated['amount'],
            $validated
        ));
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $sale = Sale::where('company_id', $request->user()->company_id)->findOrFail($id);
        return response()->json($this->service->cancel($request->user()->company_id, $sale));
    }
}
