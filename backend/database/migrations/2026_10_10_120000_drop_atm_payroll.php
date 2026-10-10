<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ATM payroll was removed; payments now come only from release batches.
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->dropColumn('atm_account_last4');
        });

        Schema::table('benefit_transactions', function (Blueprint $table) {
            $table->dropForeign(['payroll_batch_id']);
            $table->dropColumn(['payout_method', 'payroll_batch_id', 'bank_status', 'bank_remarks']);
        });

        Schema::dropIfExists('payroll_batches');
    }

    public function down(): void
    {
        Schema::create('payroll_batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_number', 30)->unique();
            $table->foreignId('benefit_id')->constrained()->restrictOnDelete();
            $table->string('period_label', 100);
            $table->enum('status', ['draft', 'sent_to_bank', 'reconciled'])->default('draft');
            $table->date('sent_at')->nullable();
            $table->string('bank_reference', 100)->nullable();
            $table->string('crediting_report_path')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('benefit_transactions', function (Blueprint $table) {
            $table->enum('payout_method', ['cash', 'atm'])->default('cash')->after('status');
            $table->foreignId('payroll_batch_id')->nullable()->after('payout_method')->constrained()->nullOnDelete();
            $table->enum('bank_status', ['for_payroll', 'sent_to_bank', 'credited', 'crediting_failed'])->nullable()->after('payroll_batch_id');
            $table->string('bank_remarks')->nullable()->after('bank_status');
        });

        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->string('atm_account_last4', 4)->nullable()->after('contact_number');
        });
    }
};
