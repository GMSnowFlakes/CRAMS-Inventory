<?php

namespace App\Modules\Recalls\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecallNotice extends Model
{
    protected $fillable = [
        'company_id', 'product_id', 'title', 'reason', 'severity',
        'status', 'affected_qty', 'recovered_qty', 'initiated_by',
        'resolved_at', 'notes',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class);
    }

    public function initiatedBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'initiated_by');
    }
}
