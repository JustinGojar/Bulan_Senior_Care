<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class SampleDataSeeder extends Seeder
{
    private const SAMPLE_ID_STRIDE = 10;

    public function run(): void
    {
        Role::findOrCreate('leader', 'web');

        $benefits = Benefit::where('status', 'active')->get()->keyBy('benefit_type');
        $barangays = Barangay::orderBy('id')->get();
        $today = now()->startOfDay();
        $profiles = [
            ['first' => 'Juan', 'last' => 'Dela Cruz', 'age' => 60, 'sex' => 'male'],
            ['first' => 'Maria', 'last' => 'Santos', 'age' => 64, 'sex' => 'female'],
            ['first' => 'Pedro', 'last' => 'Reyes', 'age' => 70, 'sex' => 'male'],
            ['first' => 'Elena', 'last' => 'Garcia', 'age' => 79, 'sex' => 'female'],
            ['first' => 'Ramon', 'last' => 'Mendoza', 'age' => 82, 'sex' => 'male'],
        ];

        foreach ($barangays as $barangayIndex => $barangay) {
            $slug = Str::slug($barangay->barangay_name);
            $leader = User::updateOrCreate(
                ['email' => "bsca.{$slug}@osca-bulan.gov.ph"],
                [
                    'name' => "BSCA - {$barangay->barangay_name}",
                    'first_name' => 'BSCA',
                    'last_name' => $barangay->barangay_name,
                    'role' => 'leader',
                    'barangay_id' => $barangay->id,
                    'contact_number' => '09'.str_pad((string) ($barangayIndex + 1), 9, '0', STR_PAD_LEFT),
                    'status' => 'active',
                    'password' => 'password',
                ],
            );
            $leader->syncRoles(['leader']);

            foreach ($profiles as $profileIndex => $profile) {
                $serial = ($barangayIndex * self::SAMPLE_ID_STRIDE) + $profileIndex + 1;
                $birthdate = today()->subYears($profile['age'])->subDays($profileIndex * 17 + 4)->toDateString();
                $status = match ($profileIndex) {
                    0 => 'pending',
                    2 => 'inactive',
                    default => 'active',
                };
                $benefitType = match (true) {
                    $profile['age'] >= 100 => 'centenarian',
                    $profile['age'] >= 90 => 'nonagenarian',
                    $profile['age'] >= 80 => 'octogenarian',
                    default => 'social_pension',
                };
                $benefit = $benefits->get($benefitType) ?? $benefits->first();
                $oscaId = sprintf('DEMO-%d-%04d', today()->year, $serial);

                $senior = SeniorCitizen::withTrashed()->updateOrCreate(
                    ['osca_id_number' => $oscaId],
                    [
                        'barangay_id' => $barangay->id,
                        'encoded_by' => $leader->id,
                        'last_name' => $profile['last'],
                        'first_name' => $profile['first'],
                        'middle_name' => 'Sample',
                        'birthdate' => $birthdate,
                        'place_of_birth' => 'Bulan, Sorsogon',
                        'sex' => $profile['sex'],
                        'contact_number' => '09'.str_pad((string) ($serial + 100000000), 9, '0', STR_PAD_LEFT),
                        'address' => $barangay->barangay_name.', Bulan, Sorsogon',
                        'civil_status' => $profileIndex % 3 === 0 ? 'widowed' : 'married',
                        'educational_attainment' => 'Elementary graduate',
                        'other_skills' => 'Community gardening',
                        'family_composition' => 'Lives with family',
                        'association_name' => 'Bulan Senior Citizens Association',
                        'association_address' => $barangay->barangay_name.', Bulan, Sorsogon',
                        'association_membership_date' => today()->subYears(3)->toDateString(),
                        'association_position' => $profileIndex === 0 ? 'Member' : 'Senior Citizen Member',
                        'living_arrangement' => 'With family',
                        'registration_date' => today()->subDays($profileIndex + 1)->toDateString(),
                        'status' => $status,
                        'deleted_at' => $status === 'inactive' ? null : null,
                    ],
                );
                $senior->restore();

                if (! $benefit) {
                    continue;
                }

                $transactionStatus = match (true) {
                    $status === 'inactive' => 'failed',
                    $profileIndex === 4 => 'released',
                    default => 'pending',
                };
                $period = 'Sample 2026';
                BenefitTransaction::updateOrCreate(
                    [
                        'senior_citizen_id' => $senior->id,
                        'benefit_id' => $benefit->id,
                        'period_label' => $period,
                    ],
                    [
                        'distributed_by' => $leader->id,
                        'created_by' => $leader->id,
                        'updated_by' => $leader->id,
                        'date_distributed' => $transactionStatus === 'released' ? $today->copy()->subDays($profileIndex)->toDateString() : null,
                        'amount' => $benefit->amount ?? 0,
                        'status' => $transactionStatus,
                        'reference_number' => $transactionStatus === 'released' ? "SAMPLE-{$serial}" : null,
                        'remarks' => $transactionStatus === 'failed' ? 'Sample failed release for testing.' : ($transactionStatus === 'pending' ? 'Sample pending review.' : 'Sample released benefit.'),
                    ],
                );
            }

            $obsoleteSampleIds = collect(range(count($profiles) + 1, self::SAMPLE_ID_STRIDE))
                ->map(fn (int $profileNumber) => sprintf(
                    'DEMO-%d-%04d',
                    today()->year,
                    ($barangayIndex * self::SAMPLE_ID_STRIDE) + $profileNumber,
                ));

            SeniorCitizen::where('barangay_id', $barangay->id)
                ->whereIn('osca_id_number', $obsoleteSampleIds)
                ->delete();
        }
    }
}
