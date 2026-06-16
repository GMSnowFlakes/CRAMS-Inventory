<?php

namespace App\Modules\Users\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function paginate(int $companyId, array $filters = []): LengthAwarePaginator
    {
        $query = User::where('company_id', $companyId);

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'ilike', "%{$filters['search']}%")
                  ->orWhere('email', 'ilike', "%{$filters['search']}%");
            });
        }

        if (!empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        return $query->orderBy('name')->paginate(20);
    }

    public function create(int $companyId, array $data): User
    {
        return User::create([
            'company_id' => $companyId,
            'name'       => $data['name'],
            'email'      => $data['email'],
            'role'       => $data['role'] ?? 'staff',
            'password'   => Hash::make($data['password']),
        ]);
    }

    public function update(User $user, array $data): User
    {
        $payload = array_filter([
            'name'  => $data['name'] ?? null,
            'email' => $data['email'] ?? null,
            'role'  => $data['role'] ?? null,
        ]);

        if (!empty($data['password'])) {
            $payload['password'] = Hash::make($data['password']);
        }

        $user->update($payload);

        return $user->fresh();
    }

    public function delete(User $user): void
    {
        $user->delete();
    }
}
