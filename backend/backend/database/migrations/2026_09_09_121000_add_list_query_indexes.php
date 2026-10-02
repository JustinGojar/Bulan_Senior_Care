<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->index(['barangay_id', 'status', 'created_at'], 'senior_barangay_status_created_index');
            $table->index(['encoded_by', 'status', 'created_at'], 'senior_encoder_status_created_index');
        });

        Schema::table('benefit_transactions', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'benefit_transactions_status_created_index');
            $table->index(['benefit_id', 'status'], 'benefit_transactions_benefit_status_index');
        });

        Schema::table('benefit_releases', function (Blueprint $table) {
            $table->index(['release_date', 'status'], 'benefit_releases_date_status_index');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['recipient_account_id', 'created_at'], 'notifications_recipient_created_index');
            $table->index(['recipient_account_id', 'status'], 'notifications_recipient_status_index');
        });

        Schema::table('announcements', function (Blueprint $table) {
            $table->index(['published_at', 'created_at'], 'announcements_published_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropIndex('announcements_published_created_index');
        });
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_recipient_created_index');
            $table->dropIndex('notifications_recipient_status_index');
        });
        Schema::table('benefit_releases', function (Blueprint $table) {
            $table->dropIndex('benefit_releases_date_status_index');
        });
        Schema::table('benefit_transactions', function (Blueprint $table) {
            $table->dropIndex('benefit_transactions_status_created_index');
            $table->dropIndex('benefit_transactions_benefit_status_index');
        });
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->dropIndex('senior_barangay_status_created_index');
            $table->dropIndex('senior_encoder_status_created_index');
        });
    }
};