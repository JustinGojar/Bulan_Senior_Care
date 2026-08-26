<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('senior_edit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('senior_citizen_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->json('changes');
            $table->enum('status', ['pending', 'approved', 'declined'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->index(['senior_citizen_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('senior_edit_requests');
    }
};