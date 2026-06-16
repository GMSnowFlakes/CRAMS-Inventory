<?php

namespace App\Modules\Approvals\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Approvals\Services\ApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalController extends Controller
{
    public function __construct(private ApprovalService $service) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $tab       = $request->query('tab', 'pending');

        if ($tab === 'history') {
            return response()->json($this->service->historyForCompany($companyId));
        }

        return response()->json($this->service->pendingForCompany($companyId));
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $approval = $this->service->approve(
            $request->user()->company_id,
            $id,
            $request->user()->id,
            $request->input('notes')
        );

        return response()->json($approval);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $request->validate(['notes' => 'nullable|string|max:1000']);

        $approval = $this->service->reject(
            $request->user()->company_id,
            $id,
            $request->user()->id,
            $request->input('notes')
        );

        return response()->json($approval);
    }
}
