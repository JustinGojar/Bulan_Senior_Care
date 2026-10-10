<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // "Board Member" is not one of the registration form's Position options, so editing
        // such a sample record showed an empty Position. Samples use "PIO" instead.
        DB::table('senior_citizens')
            ->where('osca_id_number', 'like', 'SAMPLE-%')
            ->where('association_position', 'Board Member')
            ->update(['association_position' => 'PIO']);
    }

    public function down(): void
    {
        // The previous value was sample data only.
    }
};
