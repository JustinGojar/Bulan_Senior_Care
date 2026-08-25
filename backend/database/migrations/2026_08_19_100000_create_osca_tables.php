<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangays', function (Blueprint $table) {
            $table->id();
            $table->string('barangay_name');
            $table->string('municipality')->default('Bulan');
            $table->string('province')->default('Sorsogon');
            $table->unsignedTinyInteger('zone_number')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('barangay_id')->references('id')->on('barangays')->nullOnDelete();
        });

        Schema::create('senior_citizens', function (Blueprint $table) {
            $table->id();
            $table->string('osca_id_number')->unique();
            $table->foreignId('barangay_id')->constrained()->restrictOnDelete();
            $table->foreignId('encoded_by')->constrained('users')->restrictOnDelete();
            $table->string('last_name');
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('suffix')->nullable();
            $table->date('birthdate');
            $table->enum('sex', ['male', 'female']);
            $table->string('contact_number')->nullable();
            $table->text('address')->nullable();
            $table->string('civil_status')->nullable();
            $table->string('living_arrangement')->nullable();
            $table->date('registration_date');
            $table->enum('status', ['active', 'pending', 'inactive'])->default('pending');
            $table->string('photo_path')->nullable();
            $table->string('id_document_path')->nullable();
            $table->timestamps();
            $table->index(['last_name', 'first_name', 'birthdate']);
        });

        Schema::create('benefits', function (Blueprint $table) {
            $table->id();
            $table->string('benefit_name');
            $table->string('benefit_type')->unique();
            $table->unsignedTinyInteger('min_age');
            $table->unsignedTinyInteger('max_age')->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('funding_source');
            $table->string('schedule');
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        Schema::create('membership_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('senior_citizen_id')->constrained()->cascadeOnDelete();
            $table->date('application_date');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('registration_forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('senior_citizen_id')->constrained()->cascadeOnDelete();
            $table->foreignId('benefit_id')->constrained()->restrictOnDelete();
            $table->foreignId('admin_id')->constrained('users')->restrictOnDelete();
            $table->date('date_of_membership');
            $table->text('position_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('benefit_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('senior_citizen_id')->constrained()->cascadeOnDelete();
            $table->foreignId('benefit_id')->constrained()->restrictOnDelete();
            $table->foreignId('distributed_by')->constrained('users')->restrictOnDelete();
            $table->date('date_distributed')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('period_label')->nullable();
            $table->enum('status', ['pending', 'released', 'failed'])->default('pending');
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->unique(['senior_citizen_id', 'benefit_id', 'period_label'], 'benefit_txn_unique_period');
        });

        Schema::create('analytics_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('generated_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('barangay_id')->nullable()->constrained()->nullOnDelete();
            $table->date('generated_date');
            $table->string('report_type');
            $table->unsignedInteger('total_registered')->default(0);
            $table->text('remarks')->nullable();
            $table->enum('status', ['draft', 'approved', 'published'])->default('draft');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->string('file_path')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_account_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('recipient_account_id')->constrained('users')->cascadeOnDelete();
            $table->text('message');
            $table->enum('channel', ['email', 'sms', 'in_app']);
            $table->timestamp('date_sent')->nullable();
            $table->enum('status', ['unread', 'read', 'sent', 'failed'])->default('unread');
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('action');
            $table->string('target_type');
            $table->unsignedBigInteger('target_id');
            $table->json('before_value')->nullable();
            $table->json('after_value')->nullable();
            $table->timestamps();
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('analytics_reports');
        Schema::dropIfExists('benefit_transactions');
        Schema::dropIfExists('registration_forms');
        Schema::dropIfExists('membership_applications');
        Schema::dropIfExists('benefits');
        Schema::dropIfExists('senior_citizens');
        Schema::table('users', fn (Blueprint $table) => $table->dropForeign(['barangay_id']));
        Schema::dropIfExists('barangays');
    }
};
