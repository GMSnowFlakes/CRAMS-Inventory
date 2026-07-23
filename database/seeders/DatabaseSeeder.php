<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::create([
            'name'      => 'My Company',
            'slug'      => 'my-company',
            'email'     => null,
            'currency'  => 'USD',
            'is_active' => true,
        ]);

        User::create([
            'company_id' => $company->id,
            'name'       => 'Administrator',
            'email'      => 'admin@inventoryos.app',
            'password'   => Hash::make('password'),
            'role'       => 'admin',
        ]);

        Branch::create([
            'company_id' => $company->id,
            'name'       => 'Main Branch',
            'code'       => 'MAIN',
            'is_main'    => true,
            'is_active'  => true,
        ]);
    }
}
