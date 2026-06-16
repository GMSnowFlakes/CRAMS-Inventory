<?php

namespace App\Modules\Customers\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Modules\Customers\Requests\StoreCustomerRequest;
use App\Modules\Customers\Requests\UpdateCustomerRequest;
use App\Modules\Customers\Services\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function __construct(private CustomerService $service) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('all')) {
            return response()->json($this->service->all($request->user()->company_id));
        }
        return response()->json(
            $this->service->paginate($request->user()->company_id, $request->only('search', 'is_active'))
        );
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        return response()->json(
            $this->service->create($request->user()->company_id, $request->validated()),
            201
        );
    }

    public function show(Request $request, Customer $customer): JsonResponse
    {
        abort_if($customer->company_id !== $request->user()->company_id, 403);
        return response()->json($customer);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        abort_if($customer->company_id !== $request->user()->company_id, 403);
        return response()->json($this->service->update($customer, $request->validated()));
    }

    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        abort_if($customer->company_id !== $request->user()->company_id, 403);
        $this->service->delete($customer);
        return response()->json(null, 204);
    }
}
