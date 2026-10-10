<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/**
 * Creates one BSCA leader account per official barangay. A barangay that already has its own
 * leader account is skipped, and existing BSCA accounts are left untouched so a re-run never
 * resets a password a leader has since changed.
 */
class BscaLeaderSeeder extends Seeder
{
    /** Temporary password; leaders should change it after their first sign-in. */
    private const TEMPORARY_PASSWORD = 'password';

    public function run(): void
    {
        Role::findOrCreate('leader', 'web');

        $created = 0;
        foreach (DatabaseSeeder::BARANGAYS as $name) {
            $barangay = Barangay::firstOrCreate(['barangay_name' => $name]);
            $email = 'bsca.'.Str::slug($name).'@osca-bulan.gov.ph';

            $hasOtherLeader = User::where('role', 'leader')
                ->where('barangay_id', $barangay->id)
                ->where('email', '!=', $email)
                ->exists();
            if ($hasOtherLeader || User::withTrashed()->where('email', $email)->exists()) {
                continue;
            }

            $leader = User::create([
                'name' => "BSCA - {$name}",
                'first_name' => 'BSCA',
                'last_name' => $name,
                'email' => $email,
                'password' => self::TEMPORARY_PASSWORD,
                'role' => 'leader',
                'barangay_id' => $barangay->id,
                'address' => "{$name}, Bulan, Sorsogon",
                'status' => 'active',
            ]);
            // The office provisions these accounts, so they skip email verification.
            $leader->forceFill(['email_verified_at' => now()])->save();
            $leader->syncRoles(['leader']);
            $created++;
        }

        $this->command?->info("Created {$created} BSCA leader accounts.");
    }
}
