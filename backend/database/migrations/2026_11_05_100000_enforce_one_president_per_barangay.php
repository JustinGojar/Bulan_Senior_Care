<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** One president account per barangay. Heads and admins keep NULL barangay_id
     *  and are not affected by the constraint. */
    public function up(): void
    {
        $driver = DB::getDriverName();

        // The existence guards below make this migration safe to re-run after a
        // partially applied run: MySQL DDL is not transactional, so a failure on
        // the index step leaves the column behind without the migration being recorded.
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            // MySQL has no partial indexes: index a generated column that is only
            // non-NULL for president accounts (NULLs never collide in a unique index).
            if (! Schema::hasColumn('users', 'president_barangay_id')) {
                DB::statement("ALTER TABLE users ADD COLUMN president_barangay_id BIGINT UNSIGNED
                    GENERATED ALWAYS AS (CASE WHEN role = 'president' THEN barangay_id ELSE NULL END) VIRTUAL");
            }

            $indexExists = DB::select(
                'SELECT 1 FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
                ['users', 'users_one_president_per_barangay']
            );

            if (empty($indexExists)) {
                DB::statement('CREATE UNIQUE INDEX users_one_president_per_barangay ON users (president_barangay_id)');
            }

            return;
        }

        // IF NOT EXISTS is the existence check for the partial index (SQLite/PostgreSQL).
        DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS users_one_president_per_barangay
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
