<?php

namespace App\Modules\TransferOrders\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransferOrderRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'from_branch_id'   => ['required', 'integer', 'exists:branches,id'],
            'to_branch_id'     => ['required', 'integer', 'exists:branches,id', 'different:from_branch_id'],
            'transfer_date'    => ['required', 'date'],
            'notes'            => ['nullable', 'string'],
            'items'            => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'   => ['required', 'numeric', 'gt:0'],
        ];
    }
}
