<?php

namespace App\Modules\Branches\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Modules\Branches\Requests\StoreBranchRequest;
use App\Modules\Branches\Requests\UpdateBranchRequest;
use App\Modules\Branches\Services\BranchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function __construct(private BranchService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->paginate($request->user()->company_id)
        );
    }

    public function store(StoreBranchRequest $request): JsonResponse
    {
        $branch = $this->service->create($request->user()->company_id, $request->validated());
        return response()->json($branch, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $branch = Branch::where('company_id', $request->user()->company_id)->findOrFail($id);
        return response()->json($branch);
    }

    public function update(UpdateBranchRequest $request, int $id): JsonResponse
    {
        $branch = Branch::where('company_id', $request->user()->company_id)->findOrFail($id);
        return response()->json($this->service->update($branch, $request->validated()));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $branch = Branch::where('company_id', $request->user()->company_id)->findOrFail($id);
        $this->service->delete($branch);
        return response()->json(null, 204);
    }
}
