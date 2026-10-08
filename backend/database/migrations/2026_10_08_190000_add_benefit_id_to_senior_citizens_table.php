<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The program a senior is enrolled in. It used to be read from a "Registration" payment
        // record made at sign-up, which looked like a release; payments now come only from
        // release batches and ATM payrolls.
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->foreignId('benefit_id')->nullable()->after('barangay_id')->constrained()->nullOnDelete();
        });

        // Existing seniors keep the program of their first benefit record. Records are left as they are.
        $firstRecords = DB::table('benefit_transactions')
            ->selectRaw('senior_citizen_id, MIN(id) as first_id')
            ->groupBy('senior_citizen_id');
        DB::table('benefit_transactions')
            ->joinSub($firstRecords, 'firsts', 'firsts.first_id', '=', 'benefit_transactions.id')
            ->orderBy('benefit_transactions.id')
            ->select('benefit_transactions.senior_citizen_id', 'benefit_transactions.benefit_id')
            ->chunk(500, function ($rows): void {
                foreach ($rows as $row) {
                    DB::table('senior_citizens')
                        ->where('id', $row->senior_citizen_id)
                        ->update(['benefit_id' => $row->benefit_id]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->dropForeign(['benefit_id']);
            $table->dropColumn('benefit_id');
        });
    }
};
