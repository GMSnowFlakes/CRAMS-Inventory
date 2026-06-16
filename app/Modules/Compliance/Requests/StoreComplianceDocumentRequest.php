<?php

namespace App\Modules\Compliance\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreComplianceDocumentRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'title'         => 'required|string|max:255',
            'document_type' => 'required|in:certificate,permit,license,other',
            'product_id'    => 'nullable|integer|exists:products,id',
            'expiry_date'   => 'nullable|date',
            'file_url'      => 'nullable|string|max:2048',
            'notes'         => 'nullable|string|max:2000',
        ];
    }
}
