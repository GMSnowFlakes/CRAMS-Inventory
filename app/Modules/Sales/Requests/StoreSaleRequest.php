<?php

namespace App\Modules\Sales\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'customer_id'    => ['nullable', 'integer', 'exists:customers,id'],
            'branch_id'      => ['nullable', 'integer', 'exists:branches,id'],
            'sale_date'      => ['required', 'date'],
            'due_date'       => ['nullable', 'date'],
            'tax_rate'       => ['nullable', 'numeric', 'min:0', 'max:100'],
            'discount'       => ['nullable', 'numeric', 'min:0'],
            'notes'          => ['nullable', 'string'],
            'status'         => ['nullable', 'in:draft,confirmed'],
            'items'          => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'   => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount'   => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
