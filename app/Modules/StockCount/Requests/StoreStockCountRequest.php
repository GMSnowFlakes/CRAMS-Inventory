<?php

namespace App\Modules\StockCount\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockCountRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'branch_id' => 'nullable|integer|exists:branches,id',
            'notes'     => 'nullable|string|max:1000',
        ];
    }
}
