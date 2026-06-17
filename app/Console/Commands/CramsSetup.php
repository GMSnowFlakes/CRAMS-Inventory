<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CramsSetup extends Command
{
    protected $signature = 'crams:setup
        {--company=  : Company name}
        {--name=     : Admin full name}
        {--email=    : Admin email}
        {--password= : Admin password}';

    protected $description = 'Initial CRAMS setup: create company and admin account';

    public function handle(): int
    {
        $companyName = $this->option('company')  ?? $this->ask('Company name');
        $adminName   = $this->option('name')     ?? $this->ask('Admin full name');
        $adminEmail  = $this->option('email')    ?? $this->ask('Admin email');
        $adminPass   = $this->option('password') ?? $this->secret('Admin password');

        $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', trim($companyName)));

        $company = Company::firstOrCreate(
            ['slug' => $slug],
            ['name' => $companyName, 'slug' => $slug]
        );

        User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name'       => $adminName,
                'email'      => $adminEmail,
                'password'   => Hash::make($adminPass),
                'role'       => 'admin',
                'company_id' => $company->id,
                'is_active'  => true,
            ]
        );

        $this->info("✓ Company '{$companyName}' created");
        $this->info("✓ Admin account '{$adminEmail}' created");

        return self::SUCCESS;
    }
}
