<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $barangays = collect([
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
        ])->map(fn (string $name, int $index) => [
            'barangay_name' => $name,
            'zone_number' => $index + 1,
        ])->mapWithKeys(fn (array $barangay) => [$barangay['barangay_name'] => Barangay::updateOrCreate(['barangay_name' => $barangay['barangay_name']], $barangay)]);

        $accounts = [
            ['name' => 'Geraldine So', 'email' => 'admin@osca-bulan.gov.ph', 'role' => 'admin', 'barangay_id' => null],
            ['name' => 'Maribel Dela Cruz', 'email' => 'head@osca-bulan.gov.ph', 'role' => 'head', 'barangay_id' => null],
        ];

        User::whereNotIn('email', collect($accounts)->pluck('email'))->each(fn (User $user) => $user->delete());

        foreach (['admin', 'head'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        foreach ($accounts as $account) {
            $user = User::updateOrCreate(['email' => $account['email']], [...$account, 'password' => Hash::make('password')]);
            $user->syncRoles([$account['role']]);
        }

        $this->call(BenefitSeeder::class);
    }
}
