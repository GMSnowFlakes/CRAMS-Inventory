<?php

namespace App\Modules\SupplierPortal\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierPortalToken extends Model
{
    protected $fillable = [
        'company_id', 'supplier_id', 'token', 'label',
        'expires_at', 'last_accessed_at', 'is_active',
    ];

    protected $casts = [
        'expires_at'       => 'datetime',
        'last_accessed_at' => 'datetime',
        'is_active'        => 'boolean',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Supplier::class);
    }
}
