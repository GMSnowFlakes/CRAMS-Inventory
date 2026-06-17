<?php

use App\Http\Controllers\AuthController;
use App\Modules\Updater\Controllers\UpdaterController;
use App\Modules\Approvals\Controllers\ApprovalController;
use App\Modules\AuditLogs\Controllers\AuditLogController;
use App\Modules\Compliance\Controllers\ComplianceController;
use App\Modules\Recalls\Controllers\RecallController;
use App\Modules\SupplierPortal\Controllers\SupplierPortalController;
use App\Modules\SupplierPortal\Controllers\SupplierPortalPublicController;
use App\Modules\Barcode\Controllers\BarcodeController;
use App\Modules\Branches\Controllers\BranchController;
use App\Modules\Inventory\Controllers\InventoryController;
use App\Modules\Products\Controllers\ProductController;
use App\Modules\PurchaseOrders\Controllers\PurchaseOrderController;
use App\Modules\Reports\Controllers\ReportController;
use App\Modules\Settings\Controllers\SettingController;
use App\Modules\Settings\Controllers\IndustryKitController;
use App\Modules\StockCount\Controllers\StockCountController;
use App\Modules\Suppliers\Controllers\SupplierController;
use App\Modules\Customers\Controllers\CustomerController;
use App\Modules\Sales\Controllers\SaleController;
use App\Modules\TransferOrders\Controllers\TransferOrderController;
use App\Modules\Users\Controllers\UserController;
use App\Modules\POS\Controllers\POSController;
use App\Modules\Expenses\Controllers\ExpenseController;
use App\Modules\Forecasting\Controllers\ForecastingController;
use App\Modules\DnaScore\Controllers\DnaScoreController;
use App\Modules\HealthScore\Controllers\HealthScoreController;
use App\Modules\Simulator\Controllers\SimulatorController;
use App\Modules\Franchise\Controllers\FranchiseController;
use Illuminate\Support\Facades\Route;

// Public — branding for login page
Route::get('/settings/branding', [SettingController::class, 'branding']);

// Public — supplier portal view (no auth)
Route::get('/supplier-portal/view/{token}', [SupplierPortalPublicController::class, 'show']);

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout',          [AuthController::class, 'logout']);
    Route::get('/auth/me',               [AuthController::class, 'me']);
    Route::put('/auth/profile',          [AuthController::class, 'updateProfile']);

    // Products
    Route::get('/products/categories',   [ProductController::class, 'categories']);
    Route::post('/products/bulk-import', [ProductController::class, 'bulkImport']);
    Route::apiResource('/products', ProductController::class);

    // Suppliers
    Route::apiResource('/suppliers', SupplierController::class);

    // Inventory
    Route::get('/inventory/stock-levels', [InventoryController::class, 'stockLevels']);
    Route::get('/inventory/movements',    [InventoryController::class, 'movements']);
    Route::post('/inventory/stock-in',    [InventoryController::class, 'stockIn']);
    Route::post('/inventory/stock-out',   [InventoryController::class, 'stockOut']);
    Route::post('/inventory/adjustments', [InventoryController::class, 'adjust']);

    // Reports
    Route::get('/reports/inventory-summary',   [ReportController::class, 'inventorySummary']);
    Route::get('/reports/movement-summary',    [ReportController::class, 'movementSummary']);
    Route::get('/reports/top-products',        [ReportController::class, 'topProducts']);
    Route::get('/reports/stock-valuation',     [ReportController::class, 'stockValuation']);
    Route::get('/reports/reorder-suggestions', [ReportController::class, 'reorderSuggestions']);
    Route::get('/reports/dead-stock',          [ReportController::class, 'deadStock']);
    Route::get('/reports/cash-flow-impact',    [ReportController::class, 'cashFlowImpact']);
    Route::get('/reports/timeline',            [ReportController::class, 'inventoryTimeline']);
    Route::get('/reports/insights',            [ReportController::class, 'insights']);
    Route::get('/reports/health-breakdown',    [ReportController::class, 'healthScoreBreakdown']);
    Route::get('/reports/sales-summary',       [ReportController::class, 'salesSummary']);
    Route::get('/reports/sales-by-period',     [ReportController::class, 'salesByPeriod']);
    Route::get('/reports/top-customers',       [ReportController::class, 'topCustomers']);
    Route::get('/reports/top-selling',         [ReportController::class, 'topSellingProducts']);
    Route::get('/reports/profit-loss',         [ReportController::class, 'profitLoss']);
    Route::get('/reports/overdue-sales',       [ReportController::class, 'overdueSales']);
    Route::get('/reports/expense-summary',     [ReportController::class, 'expenseSummary']);
    Route::get('/reports/customer-statement/{customerId}', [ReportController::class, 'customerStatement']);
    Route::get('/reports/export/inventory',   [ReportController::class, 'exportInventory']);
    Route::get('/reports/export/sales',       [ReportController::class, 'exportSales']);
    Route::get('/reports/export/expenses',    [ReportController::class, 'exportExpenses']);
    Route::get('/reports/export/movements',   [ReportController::class, 'exportMovements']);
    Route::get('/reports/supplier-statement/{supplierId}', [ReportController::class, 'supplierStatement']);
    Route::get('/reports/low-stock',          [ReportController::class, 'lowStockAlerts']);

    // Users
    Route::apiResource('/users', UserController::class);

    // Branches
    Route::apiResource('/branches', BranchController::class);

    // Barcode
    Route::post('/barcode/assign/{product}', [BarcodeController::class, 'assign']);
    Route::get('/barcode/lookup',            [BarcodeController::class, 'lookup']);

    // Purchase Orders
    Route::post('/purchase-orders/{id}/receive',         [PurchaseOrderController::class, 'receive']);
    Route::post('/purchase-orders/{id}/cancel',          [PurchaseOrderController::class, 'cancel']);
    Route::post('/purchase-orders/{id}/record-payment',  [PurchaseOrderController::class, 'recordPayment']);
    Route::apiResource('/purchase-orders', PurchaseOrderController::class)->except(['update', 'destroy']);

    // Stock Counts
    Route::post('/stock-counts/{id}/commit', [StockCountController::class, 'commit']);
    Route::put('/stock-counts/{id}/items',   [StockCountController::class, 'update']);
    Route::apiResource('/stock-counts', StockCountController::class)->except(['update', 'destroy']);

    // Audit Logs
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // Transfer Orders
    Route::post('/transfer-orders/{transferOrder}/dispatch', [TransferOrderController::class, 'dispatch']);
    Route::post('/transfer-orders/{transferOrder}/receive',  [TransferOrderController::class, 'receive']);
    Route::post('/transfer-orders/{transferOrder}/cancel',   [TransferOrderController::class, 'cancel']);
    Route::apiResource('/transfer-orders', TransferOrderController::class)->except(['update', 'destroy']);

    // Customers
    Route::apiResource('/customers', CustomerController::class);

    // Sales
    Route::post('/sales/{id}/confirm',         [SaleController::class, 'confirm']);
    Route::post('/sales/{id}/record-payment',  [SaleController::class, 'recordPayment']);
    Route::post('/sales/{id}/cancel',          [SaleController::class, 'cancel']);
    Route::apiResource('/sales', SaleController::class)->except(['update', 'destroy']);

    // POS
    Route::get('/pos/products', [POSController::class, 'products']);
    Route::post('/pos/sale',    [POSController::class, 'sale']);

    // Expenses
    Route::get('/expenses/categories',   [ExpenseController::class, 'categories']);
    Route::post('/expenses/bulk-import', [ExpenseController::class, 'bulkImport']);
    Route::apiResource('/expenses', ExpenseController::class);

    // Industry Kits
    Route::get('/industry-kits',            [IndustryKitController::class, 'index']);
    Route::get('/industry-kits/config',     [IndustryKitController::class, 'config']);
    Route::post('/industry-kits/apply',     [IndustryKitController::class, 'apply']);

    // Settings (branding write + logo upload)
    Route::post('/settings',            [SettingController::class, 'update']);
    Route::post('/settings/logo',       [SettingController::class, 'uploadLogo']);
    Route::delete('/settings/logo',     [SettingController::class, 'removeLogo']);

    // Forecasting
    Route::get('/forecasting', [ForecastingController::class, 'index']);

    // DNA Score
    Route::get('/dna-scores', [DnaScoreController::class, 'index']);

    // Health Score
    Route::get('/health-score', [HealthScoreController::class, 'show']);

    // Simulator
    Route::get('/simulator/products', [SimulatorController::class, 'products']);
    Route::post('/simulator/run',     [SimulatorController::class, 'run']);

    // Approvals
    Route::get('/approvals',                        [ApprovalController::class, 'index']);
    Route::post('/approvals/{id}/approve',          [ApprovalController::class, 'approve']);
    Route::post('/approvals/{id}/reject',           [ApprovalController::class, 'reject']);

    // Compliance
    Route::get('/compliance/alerts',                [ComplianceController::class, 'alerts']);
    Route::get('/compliance/documents',             [ComplianceController::class, 'index']);
    Route::post('/compliance/documents',            [ComplianceController::class, 'store']);
    Route::put('/compliance/documents/{id}',        [ComplianceController::class, 'update']);
    Route::delete('/compliance/documents/{id}',     [ComplianceController::class, 'destroy']);

    // Recalls
    Route::get('/recalls/active-count',             [RecallController::class, 'activeCount']);
    Route::post('/recalls/{id}/resolve',            [RecallController::class, 'resolve']);
    Route::apiResource('/recalls', RecallController::class)->except(['update', 'destroy']);

    // Franchise
    Route::get('/franchise/summary', [FranchiseController::class, 'summary']);
    Route::get('/franchise/list',    [FranchiseController::class, 'list']);
    Route::post('/franchise/add',    [FranchiseController::class, 'add']);
    Route::delete('/franchise/{id}', [FranchiseController::class, 'remove']);

    // Supplier Portal (internal)
    Route::get('/supplier-portal/tokens',           [SupplierPortalController::class, 'index']);
    Route::post('/supplier-portal/tokens',          [SupplierPortalController::class, 'store']);
    Route::delete('/supplier-portal/tokens/{id}',   [SupplierPortalController::class, 'destroy']);

    // System Updater
    Route::get('/updater/check',   [UpdaterController::class, 'check']);
    Route::post('/updater/apply',  [UpdaterController::class, 'update']);
});
