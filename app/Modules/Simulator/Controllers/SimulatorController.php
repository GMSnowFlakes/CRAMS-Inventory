<?php

namespace App\Modules\Simulator\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Simulator\Services\SimulatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SimulatorController extends Controller
{
    public function __construct(private SimulatorService $service) {}

    public function products(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->products($request->user()->company_id)
        );
    }

    public function run(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'order_qty'  => ['required', 'integer', 'min:1'],
        ]);

        return response()->json(
            $this->service->run(
                $request->user()->company_id,
                (int) $request->product_id,
                (int) $request->order_qty
            )
        );
    }
}
