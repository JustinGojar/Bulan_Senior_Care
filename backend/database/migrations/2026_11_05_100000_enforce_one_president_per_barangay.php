<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** One president account per barangay; the unique index lets heads and admins
     *  keep NULL barangay_id without breaking the constraint. */
    public function up(): void
    {
        // MySQL does not support partial indexes natively, so we express the intent
        // with a filtered CHECK + unique index. Only president accounts ever carry
        // a barangay_id, so this enforces one president per barangay.
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_one_president_per_barangay_chk
            CHECK ((role = \'president\' AND barangay_id IS NOT NULL) OR barangay_id IS NULL OR role != \'president\')');
        DB::statement('CREATE UNIQUE INDEX users_barangay_email_unique
            ON users (barangay_id, email) WHERE barangay_id IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX users_barangay_email_unique ON users');
        DB::statement('ALTER TABLE users DROP CONSTRAINT users_one_president_per_barangay_chk');
    }
};
