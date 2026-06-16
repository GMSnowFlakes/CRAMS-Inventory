<?php

namespace App\Modules\Recalls\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecallRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'product_id'   => 'required|integer|exists:products,id',
            'title'        => 'required|string|max:255',
            'reason'       => 'required|string',
            'severity'     => 'required|in:low,medium,high,critical',
            'affected_qty' => 'required|integer|min:1',
        ];
    }
}
