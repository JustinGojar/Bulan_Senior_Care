<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('benefit_releases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('benefit_id')->constrained()->restrictOnDelete();
            $table->string('period_label', 100);
            $table->date('release_date');
            $table->enum('status', ['scheduled', 'released', 'cancelled'])->default('scheduled');
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['benefit_id', 'period_label'], 'benefit_release_unique_period');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('benefit_releases');
    }
};