<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** The remark the Eligibility Review page used to save on a rejected registration. */
    private const OLD_REMARK = 'Marked not eligible during eligibility review.';

    public function up(): void
    {
        // Rejections were saved as "other" with a fixed remark; give them their own reason so
        // they can be filtered.
        DB::table('senior_citizens')
            ->where('inactive_reason', 'other')
            ->where('inactive_remarks', self::OLD_REMARK)
            ->update(['inactive_reason' => 'not_eligible', 'inactive_remarks' => null]);
    }

    public function down(): void
    {
        DB::table('senior_citizens')
            ->where('inactive_reason', 'not_eligible')
            ->whereNull('inactive_remarks')
            ->update(['inactive_reason' => 'other', 'inactive_remarks' => self::OLD_REMARK]);
    }
};
