<?php

namespace App\Modules\Compliance\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplianceDocument extends Model
{
    protected $fillable = [
        'company_id', 'product_id', 'title', 'document_type',
        'expiry_date', 'file_url', 'notes',
    ];

    protected $casts = [
        'expiry_date' => 'date',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class);
    }
}
