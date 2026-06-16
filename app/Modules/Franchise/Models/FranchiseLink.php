<?php

namespace App\Modules\Franchise\Models;

use App\Models\Company;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FranchiseLink extends Model
{
    protected $fillable = ['hq_company_id', 'franchise_company_id', 'label', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function hq(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'hq_company_id');
    }

    public function franchise(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'franchise_company_id');
    }
}
