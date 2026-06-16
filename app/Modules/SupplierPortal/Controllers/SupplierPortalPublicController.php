<?php

namespace App\Modules\SupplierPortal\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\SupplierPortal\Services\SupplierPortalService;
use Illuminate\Http\JsonResponse;

class SupplierPortalPublicController extends Controller
{
    public function __construct(private SupplierPortalService $service) {}

    public function show(string $token): JsonResponse
    {
        $record = $this->service->resolveToken($token);

        if (!$record) {
            return response()->json(['message' => 'Invalid or expired token'], 404);
        }

        $orders = $this->service->portalPurchaseOrders($record->supplier_id, $record->company_id);

        return response()->json([
            'supplier'        => $record->supplier,
            'label'           => $record->label,
            'purchase_orders' => $orders,
        ]);
    }
}
