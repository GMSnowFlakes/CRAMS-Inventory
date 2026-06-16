<?php

namespace App\Modules\PurchaseOrders\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'supplier_id'           => 'required|integer|exists:suppliers,id',
            'branch_id'             => 'nullable|integer|exists:branches,id',
            'order_date'            => 'required|date',
            'expected_date'         => 'nullable|date|after_or_equal:order_date',
            'tax_rate'              => 'nullable|numeric|min:0|max:100',
            'notes'                 => 'nullable|string|max:1000',
            'items'                 => 'required|array|min:1',
            'items.*.product_id'    => 'required|integer|exists:products,id',
            'items.*.quantity'      => 'required|numeric|min:0.001',
            'items.*.unit_cost'     => 'required|numeric|min:0',
        ];
    }
}
