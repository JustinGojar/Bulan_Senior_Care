<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A copy of each profile and senior photo, so it survives a redeploy that wipes storage/app/public.
        Schema::create('stored_photos', function (Blueprint $table) {
            $table->id();
            $table->string('path')->unique();
            $table->string('mime_type', 50);
            $table->longText('contents');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stored_photos');
    }
};
