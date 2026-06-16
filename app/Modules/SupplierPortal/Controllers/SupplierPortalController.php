<?php

namespace App\Modules\SupplierPortal\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\SupplierPortal\Services\SupplierPortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierPortalController extends Controller
{
    public function __construct(private SupplierPortalService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->listTokens(
                $request->user()->company_id,
                $request->query('supplier_id') ? (int) $request->query('supplier_id') : null
            )
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'label'       => 'required|string|max:255',
            'expires_at'  => 'nullable|date|after:now',
        ]);

        $token = $this->service->generateToken(
            $request->user()->company_id,
            $data['supplier_id'],
            $data['label'],
            $data['expires_at'] ?? null
        );

        return response()->json($token->load('supplier:id,name'), 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->service->revokeToken($request->user()->company_id, $id);
        return response()->json(['message' => 'Token revoked']);
    }
}
