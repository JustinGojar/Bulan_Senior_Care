<?php

use App\Models\Barangay;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            foreach (DB::table('barangays')->get(['id', 'barangay_name']) as $barangay) {
                if (! preg_match('/^Zone ([1-8]) \([^)]+\)$/', $barangay->barangay_name, $matches)) {
                    continue;
                }

                $old = $barangay->barangay_name;
                $name = 'Zone '.$matches[1];
                // Rename in place so all assignments and historical relationships retain their IDs.
                DB::table('barangays')->where('id', $barangay->id)->update(['barangay_name' => $name]);

                // Only generated names are changed; personal names and login emails are retained.
                DB::table('users')->where('barangay_id', $barangay->id)
                    ->where('name', "BSCA - {$old}")->update(['name' => "BSCA - {$name}"]);
                DB::table('users')->where('barangay_id', $barangay->id)
                    ->where('first_name', 'BSCA')->where('last_name', $old)->update(['last_name' => $name]);
                DB::table('users')->where('barangay_id', $barangay->id)
                    ->where('role', 'president')->update(['address' => "{$name}, Bulan, Sorsogon"]);

                foreach (['address', 'place_of_birth', 'association_name', 'association_address'] as $column) {
                    DB::table('senior_citizens')->where('barangay_id', $barangay->id)
                        ->where($column, 'like', '%'.$old.'%')->orderBy('id')
                        ->chunkById(200, function ($seniors) use ($column, $old, $name) {
                            foreach ($seniors as $senior) {
                                DB::table('senior_citizens')->where('id', $senior->id)
                                    ->update([$column => str_replace($old, $name, $senior->{$column})]);
                            }
                        }, 'id');
                }
            }
        });

        Cache::forget(Barangay::LIST_CACHE_KEY);
    }

    public function down(): void
    {
        // Keep corrected names: later edits cannot safely be distinguished from migrated data.
    }
};
