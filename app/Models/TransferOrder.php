<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransferOrder extends Model
{
    protected $fillable = [
        'company_id', 'from_branch_id', 'to_branch_id', 'created_by',
        'transfer_number', 'status', 'transfer_date', 'received_date', 'notes',
    ];

    protected $casts = [
        'transfer_date' => 'date',
        'received_date' => 'date',
    ];

    public function company(): BelongsTo    { return $this->belongsTo(Company::class); }
    public function fromBranch(): BelongsTo { return $this->belongsTo(Branch::class, 'from_branch_id'); }
    public function toBranch(): BelongsTo   { return $this->belongsTo(Branch::class, 'to_branch_id'); }
    public function createdBy(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }
    public function items(): HasMany        { return $this->hasMany(TransferOrderItem::class); }
}
