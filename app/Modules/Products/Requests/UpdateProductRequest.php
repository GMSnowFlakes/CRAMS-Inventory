<?php

namespace App\Modules\Products\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('product')?->id;

        return [
            'name'          => ['sometimes', 'string', 'max:255'],
            'sku'           => ['sometimes', 'string', 'max:100', "unique:products,sku,{$id}"],
            'description'   => ['nullable', 'string'],
            'category'      => ['nullable', 'string', 'max:100'],
            'unit'          => ['nullable', 'string', 'max:50'],
            'cost_price'    => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'supplier_id'   => ['nullable', 'integer', 'exists:suppliers,id'],
            'is_active'     => ['nullable', 'boolean'],
        ];
    }
}
