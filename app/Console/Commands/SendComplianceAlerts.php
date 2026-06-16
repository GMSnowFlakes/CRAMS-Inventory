<?php

namespace App\Console\Commands;

use App\Mail\ComplianceExpiryWarning;
use App\Models\Company;
use App\Models\User;
use App\Modules\Compliance\Services\ComplianceService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendComplianceAlerts extends Command
{
    protected $signature   = 'crams:compliance-alerts';
    protected $description = 'Send compliance expiry warning emails to company admins';

    public function handle(ComplianceService $complianceService): int
    {
        $companies = Company::all();

        foreach ($companies as $company) {
            try {
                $alerts = $complianceService->expiryAlerts($company->id);

                $products  = collect($alerts['products']);
                $documents = collect($alerts['documents']);

                if ($products->isEmpty() && $documents->isEmpty()) {
                    continue;
                }

                $recipients = User::where('company_id', $company->id)
                    ->whereIn('role', ['admin', 'manager'])
                    ->get();

                if ($recipients->isEmpty()) {
                    continue;
                }

                if (!config('crams.mail_enabled')) {
                        continue;
                    }
                    Mail::to($recipients)->queue(new ComplianceExpiryWarning($products, $documents));

                $this->info("Queued compliance alert for company [{$company->id}] — {$recipients->count()} recipient(s).");
            } catch (\Throwable $e) {
                $this->error("Failed to queue compliance alert for company [{$company->id}]: " . $e->getMessage());
            }
        }

        return self::SUCCESS;
    }
}
