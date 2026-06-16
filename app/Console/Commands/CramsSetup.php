<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\User;
use App\Modules\License\Services\LicenseService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CramsSetup extends Command
{
    protected $signature = 'crams:setup
        {--company=    : Company name}
        {--name=       : Admin full name}
        {--email=      : Admin email}
        {--password=   : Admin password}
        {--license=    : License key}';

    protected $description = 'Initial CRAMS setup: create company, admin account, and activate license';

    public function handle(LicenseService $licenseService): int
    {
        $companyName = $this->option('company') ?? $this->ask('Company name');
        $adminName   = $this->option('name')    ?? $this->ask('Admin full name');
        $adminEmail  = $this->option('email')   ?? $this->ask('Admin email');
        $adminPass   = $this->option('password')?? $this->secret('Admin password');
        $licenseKey  = $this->option('license') ?? $this->ask('License key');

        // Validate license first — fail fast before creating anything
        $this->info('Verifying license...');
        try {
            $licenseService->verify($licenseKey);
        } catch (\Throwable $e) {
            $this->error('License verification failed: ' . $e->getMessage());
            return self::FAILURE;
        }

        // Create company
        $company = Company::firstOrCreate(
            ['name' => $companyName],
            ['name' => $companyName]
        );

        // Create admin user
        $user = User::updateOrCreate(
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

        // Activate license
        try {
            $licenseService->activate($licenseKey, $adminEmail);
        } catch (\Throwable $e) {
            // Already activated is fine (re-running setup)
            if (!str_contains($e->getMessage(), 'already activated')) {
                $this->error('License activation failed: ' . $e->getMessage());
                return self::FAILURE;
            }
        }

        $this->info("✓ Company '{$companyName}' created");
        $this->info("✓ Admin account '{$adminEmail}' created");
        $this->info('✓ License activated');

        return self::SUCCESS;
    }
}
