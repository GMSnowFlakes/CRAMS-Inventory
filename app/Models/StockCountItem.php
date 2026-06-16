<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockCountItem extends Model
{
    protected $fillable = [
        'stock_count_id', 'product_id', 'system_qty', 'counted_qty',
    ];

    protected $casts = [
        'system_qty'  => 'decimal:3',
        'counted_qty' => 'decimal:3',
        'variance'    => 'decimal:3',
    ];

    public function stockCount(): BelongsTo { return $this->belongsTo(StockCount::class); }
    public function product(): BelongsTo    { return $this->belongsTo(Product::class); }
}
