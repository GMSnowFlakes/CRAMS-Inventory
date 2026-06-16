<?php

namespace App\Modules\Compliance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Compliance\Requests\StoreComplianceDocumentRequest;
use App\Modules\Compliance\Services\ComplianceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplianceController extends Controller
{
    public function __construct(private ComplianceService $service) {}

    public function alerts(Request $request): JsonResponse
    {
        return response()->json($this->service->expiryAlerts($request->user()->company_id));
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->documents($request->user()->company_id, $request->only('document_type', 'product_id'))
        );
    }

    public function store(StoreComplianceDocumentRequest $request): JsonResponse
    {
        $doc = $this->service->store($request->user()->company_id, $request->validated());
        return response()->json($doc, 201);
    }

    public function update(StoreComplianceDocumentRequest $request, int $id): JsonResponse
    {
        return response()->json(
            $this->service->update($request->user()->company_id, $id, $request->validated())
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->service->destroy($request->user()->company_id, $id);
        return response()->json(['message' => 'Deleted']);
    }
}
