<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\PaymentController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'name' => 'Healthcare CRM Dashboard API',
    'status' => 'ok',
    'docs' => '/api/auth/login',
]));

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:api');
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware('auth:api');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth:api');
});

Route::middleware(['auth:api'])->group(function () {
    Route::get('patients/{patient}/history', [PatientController::class, 'history']);
    Route::post('patients/{patient}/history', [PatientController::class, 'addHistory']);
    Route::apiResource('patients', PatientController::class);

    Route::get('appointments/search', [AppointmentController::class, 'search']);
    Route::apiResource('appointments', AppointmentController::class);

    Route::post('payments/{payment}/receipt', [PaymentController::class, 'receipt']);
    Route::get('payments/{payment}', [PaymentController::class, 'show']);
    Route::post('payments', [PaymentController::class, 'store']);
    Route::post('patients/{patient}/invoices', [PaymentController::class, 'createInvoice']);
    Route::get('patients/{patient}/invoices', [PaymentController::class, 'patientInvoices']);

    Route::prefix('analytics')->group(function () {
        Route::get('dashboard', [AnalyticsController::class, 'dashboard']);
        Route::get('patients', [AnalyticsController::class, 'patients']);
        Route::get('revenue', [AnalyticsController::class, 'revenue']);
        Route::get('appointments', [AnalyticsController::class, 'appointments']);
    });
});
