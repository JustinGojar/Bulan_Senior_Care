<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BenefitController;
use App\Http\Controllers\BenefitTransactionController;
use App\Http\Controllers\SeniorCitizenController;
use App\Http\Controllers\SeniorEditRequestController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\OverviewController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/overview', OverviewController::class);
Route::get('/announcements', [AnnouncementController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile/password', [AuthController::class, 'changePassword']);
    Route::get('/barangays', [AuthController::class, 'barangays']);
    Route::post('/admin/barangay-leaders', [AuthController::class, 'createBarangayLeader']);
    Route::get('/seniors/archive', [SeniorCitizenController::class, 'archive']);
    Route::post('/seniors/archive/{oscaId}/restore', [SeniorCitizenController::class, 'restore']);
    Route::get('/admin/users', [UserController::class, 'index']);
    Route::put('/admin/users/{user}', [UserController::class, 'update']);
    Route::delete('/admin/users/{user}', [UserController::class, 'destroy']);
    Route::apiResource('seniors', SeniorCitizenController::class);
    Route::get('/senior-edit-requests', [SeniorEditRequestController::class, 'index']);
    Route::post('/senior-edit-requests', [SeniorEditRequestController::class, 'store']);
    Route::patch('/senior-edit-requests/{seniorEditRequest}', [SeniorEditRequestController::class, 'update']);
    Route::get('/benefits', [BenefitController::class, 'index']);
    Route::get('/benefit-transactions', [BenefitTransactionController::class, 'index']);
    Route::patch('/benefit-transactions/{benefitTransaction}', [BenefitTransactionController::class, 'update']);
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::post('/announcements/{announcement}/comments', [AnnouncementController::class, 'comment']);
    Route::get('/messages', [MessageController::class, 'index']);
    Route::get('/messages/recipients', [MessageController::class, 'recipients']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::delete('/messages/conversations/{user}', [MessageController::class, 'destroyConversation']);
    Route::post('/messages/{message}/read', [MessageController::class, 'read']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::delete('/notifications', [NotificationController::class, 'clear']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'read']);
});
