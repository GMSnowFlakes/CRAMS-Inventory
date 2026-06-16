<?php

namespace App\Modules\Branches\Services;

use App\Models\Branch;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class BranchService
{
    public function paginate(int $companyId): LengthAwarePaginator
    {
        return Branch::where('company_id', $companyId)
            ->orderByDesc('is_main')
            ->orderBy('name')
            ->paginate(50);
    }

    public function create(int $companyId, array $data): Branch
    {
        if (!empty($data['is_main']) && $data['is_main']) {
            Branch::where('company_id', $companyId)->update(['is_main' => false]);
        }

        return Branch::create(array_merge($data, ['company_id' => $companyId]));
    }

    public function update(Branch $branch, array $data): Branch
    {
        if (!empty($data['is_main']) && $data['is_main']) {
            Branch::where('company_id', $branch->company_id)
                ->where('id', '!=', $branch->id)
                ->update(['is_main' => false]);
        }

        $branch->update($data);

        return $branch->fresh();
    }

    public function delete(Branch $branch): void
    {
        abort_if($branch->is_main, 422, 'Cannot delete the main branch.');
        $branch->delete();
    }
}
