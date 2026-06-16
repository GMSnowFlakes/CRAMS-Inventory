<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    protected $fillable = [
        'company_id', 'supplier_id', 'branch_id', 'created_by',
        'po_number', 'status', 'order_date', 'expected_date',
        'received_date', 'subtotal', 'tax', 'total', 'notes',
    ];

    protected $casts = [
        'order_date'    => 'date',
        'expected_date' => 'date',
        'received_date' => 'date',
        'subtotal'    => 'decimal:2',
        'tax'         => 'decimal:2',
        'total'       => 'decimal:2',
        'amount_paid' => 'decimal:2',
    ];

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function supplier(): BelongsTo  { return $this->belongsTo(Supplier::class); }
    public function branch(): BelongsTo    { return $this->belongsTo(Branch::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function items(): HasMany    { return $this->hasMany(PurchaseOrderItem::class); }
    public function payments(): HasMany { return $this->hasMany(PurchaseOrderPayment::class); }
}
