<?php

namespace App\Observers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditObserver
{
    public function created(Model $model): void
    {
        $this->log($model, 'created', [], $model->getAttributes());
    }

    public function updated(Model $model): void
    {
        $dirty = $model->getDirty();
        if (empty($dirty)) {
            return;
        }
        $old = array_intersect_key($model->getOriginal(), $dirty);
        $this->log($model, 'updated', $old, $dirty);
    }

    public function deleted(Model $model): void
    {
        $this->log($model, 'deleted', $model->getAttributes(), []);
    }

    private function log(Model $model, string $event, array $old, array $new): void
    {
        $companyId = $model->company_id ?? (Auth::user()?->company_id);
        if (!$companyId) {
            return;
        }

        $hidden = $model->getHidden();
        $old = array_diff_key($old, array_flip($hidden));
        $new = array_diff_key($new, array_flip($hidden));

        AuditLog::create([
            'company_id'      => $companyId,
            'user_id'         => Auth::id(),
            'auditable_type'  => get_class($model),
            'auditable_id'    => $model->getKey(),
            'event'           => $event,
            'old_values'      => $old ?: null,
            'new_values'      => $new ?: null,
            'ip_address'      => Request::ip(),
            'created_at'      => now(),
        ]);
    }
}
