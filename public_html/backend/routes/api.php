<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\DeliveryCompanyController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\SettlementController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LockController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\DataSheetController;
use App\Http\Controllers\Api\DataSheetCategoryController;

// ─────────────────────────────────────────────────────────────────────────────
// Public (no auth)
// ─────────────────────────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

// ─────────────────────────────────────────────────────────────────────────────
// Protected (Sanctum auth required for all routes below)
// ─────────────────────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // ── Auth ───────────────────────────────────────────────────────────────────
    Route::post('/logout',  [AuthController::class, 'logout']);
    Route::get('/user',     [AuthController::class, 'user']);
    Route::put('/user',     [AuthController::class, 'updateProfile']);
        
    // ── Dashboard ──────────────────────────────────────────────────────────────
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ── Categories & Products (all authenticated users) ────────────────────────
    Route::apiResource('categories', CategoryController::class);
    Route::get('products/{product}/profile', [ProductController::class, 'profile']);
    Route::post('products/bulk', [ProductController::class, 'bulkStore']);
    Route::post('products/bulk-delete', [ProductController::class, 'bulkDelete']);
    Route::apiResource('products',   ProductController::class);

    // ── DataSheets / File Sharing ──────────────────────────────────────────────
    Route::get('/datasheets/{id}/download', [DataSheetController::class, 'download']);
    Route::apiResource('datasheets', DataSheetController::class);
    Route::apiResource('datasheet-categories', DataSheetCategoryController::class);

    // ── Inventory ──────────────────────────────────────────────────────────────
    Route::apiResource('inventory', InventoryController::class)
         ->parameters(['inventory' => 'inventoryItem']);
    Route::patch('/inventory/{inventoryItem}/quantity',  [InventoryController::class, 'updateQuantity']);
    Route::post('/inventory/recalculate-averages',       [InventoryController::class, 'recalculateAverages']);

    // ── Orders ─────────────────────────────────────────────────────────────────
    Route::apiResource('orders', OrderController::class);
    Route::post('/orders/{order}/return', [OrderController::class, 'returnItems']);
    // Customers
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::put('/customers/{id}', [CustomerController::class, 'update']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::post('/customers/{id}/pay', [CustomerController::class, 'payDebt']);


            
                
    

    // ── Delivery Companies ─────────────────────────────────────────────────────
    Route::apiResource('delivery-companies', DeliveryCompanyController::class)
         ->parameters(['delivery-companies' => 'deliveryCompany']);
    Route::patch('/delivery-companies/{deliveryCompany}/toggle', [DeliveryCompanyController::class, 'toggleStatus']);

    // ── Settings ───────────────────────────────────────────────────────────────
    Route::get('/settings',                   [SettingsController::class, 'index']);
    Route::put('/settings',                   [SettingsController::class, 'update']);
    Route::get('/settings/exchange-rate',     [SettingsController::class, 'getExchangeRate']);
    Route::put('/settings/exchange-rate',     [SettingsController::class, 'updateExchangeRate']);
    Route::get('/settings/exchange-rate/history', [SettingsController::class, 'getExchangeRateHistory']);
    Route::get('/settings/treasury',          [SettingsController::class, 'getTreasury']);

    // ─────────────────────────────────────────────────────────────────────────
    // 🔒 ACCOUNTANT + ADMIN only routes
    // ─────────────────────────────────────────────────────────────────────────
    
    // ─────────────────────────────────────────────────────────────────────────
    // 🔐 ADMIN only routes
    // ─────────────────────────────────────────────────────────────────────────
    
    
    // --- ERP System Routes ---
    Route::apiResource('transactions', TransactionController::class);
    
    Route::get('/payroll/{userId}', [PayrollController::class, 'getEmployeeData']);
    Route::post('/payroll/leaves', [PayrollController::class, 'storeLeave']);
    Route::delete('/payroll/leaves/{id}', [PayrollController::class, 'deleteLeave']);
    Route::post('/payroll/payments', [PayrollController::class, 'storePayment']);
    Route::delete('/payroll/payments/{id}', [PayrollController::class, 'deletePayment']);
    
    Route::get('/reports', [ReportController::class, 'index']);
    Route::get('/revenue-stream', [ReportController::class, 'revenueStream']);
    Route::get('/inventory-report', [ReportController::class, 'inventoryReport']);

    // --- HR & Employees ---
    
    Route::get('/attendances', [EmployeeController::class, 'getAttendances']);
    Route::post('/attendances', [EmployeeController::class, 'recordAttendance']);
    Route::get('/hr/alerts', [EmployeeController::class, 'getAlerts']);

    Route::middleware('admin')
->group(function () {
        // User management
        Route::get('/users',                    [AuthController::class, 'index']);
        Route::post('/users',                   [AuthController::class, 'store']);
        Route::put('/users/{user}',             [AuthController::class, 'update']);
        Route::delete('/users/{user}',          [AuthController::class, 'destroy']);
        Route::put('/users/{user}/password',    [AuthController::class, 'updatePassword']);
                
        // Accounting lock
                    });
});
Route::post('/orders/{order}/return', [OrderController::class, 'returnItems']);
    
