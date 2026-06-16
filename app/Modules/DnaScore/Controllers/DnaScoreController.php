<?php

namespace App\Modules\DnaScore\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\DnaScore\Services\DnaScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DnaScoreController extends Controller
{
    public function __construct(private DnaScoreService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->scores($request->user()->company_id)
        );
    }
}
