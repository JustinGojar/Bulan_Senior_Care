<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BenefitController;
use App\Http\Controllers\SeniorCitizenController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile/password', [AuthController::class, 'changePassword']);
    Route::get('/barangays', [AuthController::class, 'barangays']);
    Route::post('/admin/barangay-leaders', [AuthController::class, 'createBarangayLeader']);
    Route::apiResource('seniors', SeniorCitizenController::class);
    Route::get('/benefits', [BenefitController::class, 'index']);
});
