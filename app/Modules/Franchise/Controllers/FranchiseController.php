<?php

namespace App\Modules\Franchise\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Franchise\Services\FranchiseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FranchiseController extends Controller
{
    public function __construct(private FranchiseService $service) {}

    public function summary(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        return response()->json($this->service->aggregateSummary($companyId));
    }

    public function list(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        if (!$this->service->isHQ($companyId)) {
            return response()->json([]);
        }
        return response()->json($this->service->franchises($companyId));
    }

    public function add(Request $request): JsonResponse
    {
        $data = $request->validate([
            'franchise_company_id' => 'required|integer|exists:companies,id',
            'label'                => 'required|string|max:255',
        ]);

        $link = $this->service->addFranchise(
            $request->user()->company_id,
            $data['franchise_company_id'],
            $data['label']
        );

        return response()->json($link, 201);
    }

    public function remove(Request $request, int $id): JsonResponse
    {
        $deleted = $this->service->removeFranchise($request->user()->company_id, $id);

        if (!$deleted) {
            return response()->json(['message' => 'Franchise link not found'], 404);
        }

        return response()->json(['message' => 'Removed']);
    }
}
