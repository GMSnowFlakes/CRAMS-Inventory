<?php

namespace App\Modules\Branches\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBranchRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'      => 'required|string|max:255',
            'code'      => 'nullable|string|max:50',
            'address'   => 'nullable|string|max:500',
            'phone'     => 'nullable|string|max:50',
            'is_main'   => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
