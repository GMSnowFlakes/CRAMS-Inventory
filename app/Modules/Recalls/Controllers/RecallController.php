<?php

namespace App\Modules\Recalls\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Recalls\Requests\StoreRecallRequest;
use App\Modules\Recalls\Services\RecallService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecallController extends Controller
{
    public function __construct(private RecallService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->list($request->user()->company_id, $request->only('status', 'severity'))
        );
    }

    public function store(StoreRecallRequest $request): JsonResponse
    {
        $recall = $this->service->create(
            $request->user()->company_id,
            $request->user()->id,
            $request->validated()
        );
        return response()->json($recall, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        // Included for apiResource compatibility
        return response()->json(
            \App\Modules\Recalls\Models\RecallNotice::where('company_id', $request->user()->company_id)
                ->with(['product:id,name,sku', 'initiatedBy:id,name'])
                ->findOrFail($id)
        );
    }

    public function resolve(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'notes'         => 'nullable|string|max:2000',
            'recovered_qty' => 'required|integer|min:0',
        ]);

        return response()->json(
            $this->service->resolve(
                $request->user()->company_id,
                $id,
                $request->input('notes'),
                $request->input('recovered_qty', 0)
            )
        );
    }

    public function activeCount(Request $request): JsonResponse
    {
        return response()->json(['count' => $this->service->activeCount($request->user()->company_id)]);
    }
}
