<?php

namespace App\Modules\Forecasting\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Forecasting\Services\ForecastingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForecastingController extends Controller
{
    public function __construct(private ForecastingService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->forecast($request->user()->company_id)
        );
    }
}
