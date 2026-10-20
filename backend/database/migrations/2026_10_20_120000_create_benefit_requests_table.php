<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A barangay leader's request for a benefit on behalf of one senior. The Head verifies it,
     * then records the release, which files the senior's benefit transaction.
     */
    public function up(): void
    {
        Schema::create('benefit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('senior_citizen_id')->constrained()->cascadeOnDelete();
            $table->foreignId('benefit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('for_verification');
            $table->text('remarks')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->string('period_label', 100)->nullable();
            $table->date('release_date')->nullable();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('benefit_transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['senior_citizen_id', 'benefit_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('benefit_requests');
    }
};
