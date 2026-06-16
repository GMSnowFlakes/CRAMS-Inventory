<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalePayment extends Model
{
    protected $fillable = [
        'sale_id', 'created_by', 'amount', 'payment_method', 'reference', 'notes',
    ];

    protected $casts = [
        'amount' => 'float',
    ];

    public function sale(): BelongsTo      { return $this->belongsTo(Sale::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
}
