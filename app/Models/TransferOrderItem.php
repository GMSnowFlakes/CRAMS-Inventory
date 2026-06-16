<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferOrderItem extends Model
{
    protected $fillable = [
        'transfer_order_id', 'product_id',
        'quantity_requested', 'quantity_sent', 'quantity_received',
    ];

    protected $casts = [
        'quantity_requested' => 'decimal:3',
        'quantity_sent'      => 'decimal:3',
        'quantity_received'  => 'decimal:3',
    ];

    public function transferOrder(): BelongsTo { return $this->belongsTo(TransferOrder::class); }
    public function product(): BelongsTo       { return $this->belongsTo(Product::class); }
}
