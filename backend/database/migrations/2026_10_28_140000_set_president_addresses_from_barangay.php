<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** A BSCA President's address is now always "(barangay), Bulan, Sorsogon" from their assignment. */
    public function up(): void
    {
        DB::table('users')
            ->join('barangays', 'barangays.id', '=', 'users.barangay_id')
            ->where('users.role', 'president')
            ->select(['users.id', 'barangays.barangay_name'])
            ->orderBy('users.id')
            ->each(function ($row): void {
                DB::table('users')->where('id', $row->id)
                    ->update(['address' => "{$row->barangay_name}, Bulan, Sorsogon"]);
            });
    }

    public function down(): void
    {
        //
    }
};
