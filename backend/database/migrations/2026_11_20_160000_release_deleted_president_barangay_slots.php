<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            // Keep the unique index in place while excluding soft-deleted accounts.
            DB::statement("ALTER TABLE users MODIFY COLUMN president_barangay_id BIGINT UNSIGNED
                GENERATED ALWAYS AS (CASE WHEN role = 'president' AND deleted_at IS NULL THEN barangay_id ELSE NULL END) VIRTUAL");

            return;
        }

        DB::statement('DROP INDEX IF EXISTS users_one_president_per_barangay');
        DB::statement("CREATE UNIQUE INDEX users_one_president_per_barangay
            ON users (barangay_id) WHERE role = 'president' AND barangay_id IS NOT NULL AND deleted_at IS NULL");
    }

    public function down(): void
    {
        // Keep the corrected constraint: deleted accounts may now have replacements,
        // so reinstating the old constraint would reject valid existing data.
    }
};
