<?php

namespace App\Modules\Suppliers\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Modules\Suppliers\Requests\StoreSupplierRequest;
use App\Modules\Suppliers\Requests\UpdateSupplierRequest;
use App\Modules\Suppliers\Services\SupplierService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function __construct(private SupplierService $service) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $data = $this->service->paginate($companyId, $request->only(['search', 'is_active']));

        return response()->json($data);
    }

    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $supplier = $this->service->create($companyId, $request->validated());

        return response()->json($supplier, 201);
    }

    public function show(Request $request, Supplier $supplier): JsonResponse
    {
        $this->authorizeCompany($request, $supplier->company_id);

        return response()->json($supplier->load('products'));
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier): JsonResponse
    {
        $this->authorizeCompany($request, $supplier->company_id);
        $supplier = $this->service->update($supplier, $request->validated());

        return response()->json($supplier);
    }

    public function destroy(Request $request, Supplier $supplier): JsonResponse
    {
        $this->authorizeCompany($request, $supplier->company_id);
        $this->service->delete($supplier);

        return response()->json(null, 204);
    }

    private function authorizeCompany(Request $request, int $resourceCompanyId): void
    {
        abort_if($request->user()->company_id !== $resourceCompanyId, 403);
    }
}
