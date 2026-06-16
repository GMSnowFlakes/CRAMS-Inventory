<?php

namespace App\Modules\Expenses\Services;

use App\Models\Expense;
use App\Services\IndustryKitService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ExpenseService
{
    public function paginate(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $q = Expense::where('company_id', $companyId)
            ->with(['branch', 'createdBy'])
            ->orderByDesc('expense_date')
            ->orderByDesc('id');

        if (!empty($filters['category'])) {
            $q->where('category', $filters['category']);
        }
        if (!empty($filters['from'])) {
            $q->where('expense_date', '>=', $filters['from']);
        }
        if (!empty($filters['to'])) {
            $q->where('expense_date', '<=', $filters['to']);
        }

        return $q->paginate(20);
    }

    public function create(int $companyId, int $userId, array $data): Expense
    {
        return Expense::create(array_merge($data, [
            'company_id' => $companyId,
            'created_by' => $userId,
        ]));
    }

    public function update(Expense $expense, array $data): Expense
    {
        $expense->update($data);
        return $expense->fresh();
    }

    public function delete(Expense $expense): void
    {
        $expense->delete();
    }

    public function categories(int $companyId): array
    {
        $existing = Expense::where('company_id', $companyId)
            ->distinct()
            ->pluck('category')
            ->toArray();

        $kit = IndustryKitService::forCompany($companyId);
        $suggestions = $kit['expense_categories'] ?? [];

        return array_values(array_unique(array_merge($suggestions, $existing)));
    }
}
