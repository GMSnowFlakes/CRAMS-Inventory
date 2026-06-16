<?php

namespace App\Modules\HealthScore\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\HealthScore\Services\HealthScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthScoreController extends Controller
{
    public function __construct(private HealthScoreService $service) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->score($request->user()->company_id)
        );
    }
}
