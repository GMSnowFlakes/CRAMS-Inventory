<?php

namespace App\Modules\Customers\Services;

use App\Models\Customer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CustomerService
{
    public function paginate(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $q = Customer::where('company_id', $companyId)->orderBy('name');

        if (!empty($filters['search'])) {
            $term = $filters['search'];
            $q->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('email', 'like', "%{$term}%")
                  ->orWhere('phone', 'like', "%{$term}%");
            });
        }

        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $q->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        return $q->paginate(20);
    }

    public function all(int $companyId): \Illuminate\Database\Eloquent\Collection
    {
        return Customer::where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone']);
    }

    public function create(int $companyId, array $data): Customer
    {
        return Customer::create(array_merge($data, ['company_id' => $companyId]));
    }

    public function update(Customer $customer, array $data): Customer
    {
        $customer->update($data);
        return $customer->fresh();
    }

    public function delete(Customer $customer): void
    {
        $customer->delete();
    }
}
