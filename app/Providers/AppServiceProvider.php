<?php

namespace App\Providers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockCount;
use App\Models\Supplier;
use App\Observers\AuditObserver;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Vite::createAssetPathsUsing(fn (string $path, ?bool $secure = null) => '/'.ltrim($path, '/'));

        Product::observe(AuditObserver::class);
        Supplier::observe(AuditObserver::class);
        PurchaseOrder::observe(AuditObserver::class);
        StockCount::observe(AuditObserver::class);
        Branch::observe(AuditObserver::class);
    }
}
