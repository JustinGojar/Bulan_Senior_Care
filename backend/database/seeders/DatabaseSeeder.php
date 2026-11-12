<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\User;
use App\Support\RolePermissions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /** The official barangays of Bulan, Sorsogon. */
    public const BARANGAYS = [
        'A. Bonifacio (Tinurilan)', 'Abad Santos (Kambal)', 'Aguinaldo (Lipata Dako)', 'Antipolo',
        'Aquino (Imelda)', 'Beguin', 'Bical', 'Bonga', 'Butag', 'Cadandanan', 'Calomagon', 'Calpi',
        'Cocok-Cabitan', 'Daganas', 'Danao', 'Dolos', 'E. Quirino (Pinangomhan)', 'Fabrica',
        'G. Del Pilar (Tanga)', 'Gate', 'Inararan', 'J. Gerona (Biton)', 'J.P. Laurel (Pon-od)',
        'Jamorawon', 'Lajong', 'Libertad (Calle Putol)', 'Magsaysay (Bongog)', 'Managa-naga',
        'Marinab', 'Montecalvario', 'N. Roque (Calayugan)', 'Namo', 'Nasuje', 'Obrero',
        'Osmeña (Lipata Saday)', 'Otavi', 'Padre Diaz', 'Palale', 'Quezon (Cabarawan)',
        'R. Gerona (Butag)', 'Recto', 'Roxas (Busay)', 'Sagrada', 'San Francisco (Polot)',
        'San Isidro (Cabugaan)', 'San Juan Bag-o', 'San Juan Daan', 'San Rafael (Togbongon)',
        'San Ramon', 'San Vicente', 'Santa Remedios', 'Santa Teresita (Trece)', 'Sigad',
        'Somagongsong', 'Tarhan', 'Taromata', 'Zone 1 (Ilawod)', 'Zone 2 (Sabang)',
        'Zone 3 (Central)', 'Zone 4 (Central Business District)', 'Zone 5 (Canipaan)',
        'Zone 6 (Baybay)', 'Zone 7 (Iraya)', 'Zone 8 (Loyo)',
    ];

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $barangays = collect(self::BARANGAYS)->map(fn (string $name, int $index) => [
            'barangay_name' => $name,
            'zone_number' => $index + 1,
        ])->mapWithKeys(fn (array $barangay) => [$barangay['barangay_name'] => Barangay::updateOrCreate(['barangay_name' => $barangay['barangay_name']], $barangay)]);

        $demoPassword = env('OSCA_DEMO_PASSWORD') ?: Str::password(20);
        $superAdminPassword = env('OSCA_SUPER_ADMIN_PASSWORD') ?: Str::password(24);
        $accounts = [
            [
                'name' => 'OSCA Super Admin',
                'email' => env('OSCA_SUPER_ADMIN_EMAIL', 'admin@osca-bulan.gov.ph'),
                'password' => $superAdminPassword,
                'role' => 'admin',
                'barangay_id' => null,
            ],
            ['name' => 'OSCA Head', 'email' => env('OSCA_HEAD_EMAIL', 'head@osca-bulan.gov.ph'), 'password' => $demoPassword, 'role' => 'head', 'barangay_id' => null],
            ['name' => 'OSCA Encoder', 'email' => env('OSCA_ENCODER_EMAIL', 'encoder@osca-bulan.gov.ph'), 'password' => $demoPassword, 'role' => 'encoder', 'barangay_id' => null],
            ['name' => 'OSCA Viewer', 'email' => env('OSCA_VIEWER_EMAIL', 'viewer@osca-bulan.gov.ph'), 'password' => $demoPassword, 'role' => 'viewer', 'barangay_id' => null],
        ];

        foreach (array_keys(RolePermissions::SYSTEM_ROLES) as $role) {
            Role::findOrCreate($role, 'web');
        }

        $createdDemoAccounts = false;
        $createdSuperAdmin = false;
        foreach ($accounts as $account) {
            $user = User::firstOrCreate(
                ['email' => $account['email']],
                [...$account, 'must_change_password' => true],
            );
            $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now()])->save();
            $user->syncRoles([$account['role']]);
            if ($account['role'] !== 'admin') {
                $createdDemoAccounts = $createdDemoAccounts || $user->wasRecentlyCreated;
            } else {
                $createdSuperAdmin = $user->wasRecentlyCreated;
            }
        }

        if ($createdSuperAdmin) {
            $this->command?->info("Super Admin temporary password: {$superAdminPassword}");
            $this->command?->warn('Change it after the first sign-in.');
        }
        if ($createdDemoAccounts) {
            $this->command?->info("Demo account password: {$demoPassword}");
        }

        $this->call(BenefitSeeder::class);
        $this->call(BscaPresidentSeeder::class);
    }
}
