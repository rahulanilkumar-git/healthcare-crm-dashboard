<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'name' => 'Healthcare CRM Dashboard API',
    'status' => 'ok',
    'docs' => '/api/auth/login',
]));

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware(['auth:api', 'role:admin']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:api');
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware('auth:api');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth:api');
});

Route::middleware(['auth:api'])->group(function () {
    Route::apiResource('users', UserController::class)->only(['index', 'store', 'update', 'destroy'])->middleware('role:admin');

    Route::middleware('role:admin,doctor')->group(function () {
        Route::get('patients/{patient}/history', [PatientController::class, 'history']);
        Route::post('patients/{patient}/history', [PatientController::class, 'addHistory']);
        Route::apiResource('patients', PatientController::class);

        Route::get('appointments/search', [AppointmentController::class, 'search']);
        Route::apiResource('appointments', AppointmentController::class);
    });

    Route::middleware('role:admin')->group(function () {
        Route::post('payments/{payment}/receipt', [PaymentController::class, 'receipt']);
        Route::get('payments/{payment}', [PaymentController::class, 'show']);
        Route::post('payments', [PaymentController::class, 'store']);
        Route::post('payments/stripe-checkout', [PaymentController::class, 'stripeCheckout']);
        Route::post('payments/stripe-confirm', [PaymentController::class, 'stripeConfirm']);
        Route::post('patients/{patient}/invoices', [PaymentController::class, 'createInvoice']);
        Route::put('invoices/{invoice}', [PaymentController::class, 'updateInvoice']);
        Route::delete('invoices/{invoice}', [PaymentController::class, 'deleteInvoice']);
        Route::get('patients/{patient}/invoices', [PaymentController::class, 'patientInvoices']);
    });

    Route::prefix('analytics')->middleware('role:admin,doctor')->group(function () {
        Route::get('dashboard', [AnalyticsController::class, 'dashboard']);
        Route::get('patients', [AnalyticsController::class, 'patients']);
        Route::get('revenue', [AnalyticsController::class, 'revenue']);
        Route::get('appointments', [AnalyticsController::class, 'appointments']);
    });
});
