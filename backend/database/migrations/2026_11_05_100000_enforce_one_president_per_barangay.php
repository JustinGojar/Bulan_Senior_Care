<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** One president account per barangay. Heads and admins keep NULL barangay_id
     *  and are not affected by the constraint. */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            // MySQL has no partial indexes: index a generated column that is only
            // non-NULL for president accounts (NULLs never collide in a unique index).
            DB::statement("ALTER TABLE users ADD COLUMN president_barangay_id BIGINT UNSIGNED
                GENERATED ALWAYS AS (CASE WHEN role = 'president' THEN barangay_id ELSE NULL END) VIRTUAL");
            DB::statement('CREATE UNIQUE INDEX users_one_president_per_barangay ON users (president_barangay_id)');

            return;
        }

        DB::statement("CREATE UNIQUE INDEX users_one_president_per_barangay
            ON users (barangay_id) WHERE role = 'president' AND barangay_id IS NOT NULL");
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('DROP INDEX users_one_president_per_barangay ON users');
            DB::statement('ALTER TABLE users DROP COLUMN president_barangay_id');

            return;
        }

        DB::statement('DROP INDEX users_one_president_per_barangay');
    }
};
