<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Gives every barangay 20 to 30 sample senior records with a mix of active, pending, inactive
 * and archived (soft-deleted) statuses, each encoded by the barangay's BSCA account. Records
 * use "SAMPLE-<zone>-<number>" OSCA IDs, so re-running updates them in place and never touches
 * real registrations (which use "BSC-<year>-<number>").
 */
class SampleDataSeeder extends Seeder
{
    public const MIN_PER_BARANGAY = 20;

    public const MAX_PER_BARANGAY = 30;

    private const MALE_NAMES = [
        'Juan', 'Pedro', 'Ramon', 'Jose', 'Antonio', 'Eduardo', 'Rogelio', 'Ernesto', 'Domingo', 'Felipe',
        'Teodoro', 'Rodolfo', 'Alfredo', 'Danilo', 'Romeo', 'Ricardo', 'Mariano', 'Leonardo', 'Arturo', 'Benjamin',
    ];

    private const FEMALE_NAMES = [
        'Maria', 'Elena', 'Rosario', 'Teresita', 'Corazon', 'Lourdes', 'Remedios', 'Josefina', 'Natividad', 'Erlinda',
        'Leticia', 'Gloria', 'Nenita', 'Consolacion', 'Felicidad', 'Milagros', 'Purita', 'Estrella', 'Aurora', 'Rosalinda',
    ];

    private const LAST_NAMES = [
        'Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Gojar', 'Lopez', 'Gimenez', 'Grajo', 'Gilana',
        'Golimlim', 'Dematera', 'Ditan', 'Lasala', 'Bitara', 'Encinas', 'Furio', 'Gallanosa', 'Hubilla', 'Jasareno',
        'Lagdameo', 'Mirandilla', 'Ola', 'Perdigon', 'Robles', 'Sarmiento', 'Tolentino', 'Villareal', 'Yanson', 'Zamora',
    ];

    private const MIDDLE_NAMES = ['Gerona', 'Lim', 'Dolot', 'Gabito', 'Espinas', 'Fortes', 'Gacho', 'Hapa', 'Lucena', 'Romano'];

    private const CIVIL_STATUSES = ['married', 'widowed', 'married', 'single', 'widowed', 'separated'];

    private const EDUCATION = ['Elementary undergraduate', 'Elementary graduate', 'High school graduate', 'College undergraduate', 'College graduate', 'Vocational'];

    private const SKILLS = ['Farming', 'Fishing', 'Sewing', 'Carpentry', 'Cooking', 'Community gardening', 'Handicraft weaving', 'Midwifery (hilot)'];

    private const LIVING = ['With family', 'With spouse', 'Alone', 'With children', 'With relatives'];

    private const POSITIONS = ['Member', 'Member', 'Member', 'Member', 'Treasurer', 'Secretary', 'Auditor', 'Board Member'];

    public function run(): void
    {
        $this->call(BscaLeaderSeeder::class);

        // Samples from the earlier five-per-barangay seeder used "DEMO-" IDs; replace them.
        SeniorCitizen::withTrashed()->where('osca_id_number', 'like', 'DEMO-%')->forceDelete();

        $benefits = Benefit::where('status', 'active')->get()->keyBy('benefit_type');
        $period = 'Sample Q3 '.today()->year;

        // Age-threshold alerts are left to the daily check rather than raised for every sample.
        SeniorCitizen::withoutEvents(function () use ($benefits, $period) {
            foreach (Barangay::orderBy('id')->get() as $barangayIndex => $barangay) {
                $leader = User::where('role', 'leader')->where('barangay_id', $barangay->id)->orderBy('id')->first();
                if (! $leader) {
                    continue;
                }

                $count = self::countFor($barangay->barangay_name);
                for ($n = 1; $n <= $count; $n++) {
                    $this->seedSenior($barangay, $barangayIndex, $n, $leader, $benefits, $period);
                }

                // A shorter list on a re-run removes the samples beyond it.
                SeniorCitizen::withTrashed()
                    ->where('barangay_id', $barangay->id)
                    ->where('osca_id_number', 'like', self::idPrefix($barangayIndex).'%')
                    ->get()
                    ->filter(fn (SeniorCitizen $senior) => (int) substr($senior->osca_id_number, -3) > $count)
                    ->each->forceDelete();
            }
        });
    }

    /** A stable count between 20 and 30 for each barangay. */
    public static function countFor(string $barangayName): int
    {
        $span = self::MAX_PER_BARANGAY - self::MIN_PER_BARANGAY + 1;

        return self::MIN_PER_BARANGAY + (crc32($barangayName) % $span);
    }

    /**
     * Roughly 60% active, 15% pending, 15% inactive and 10% archived, in a repeating pattern so
     * every barangay has each status.
     *
     * @return array{0: string, 1: bool} status and whether the record is archived
     */
    public static function statusFor(int $n): array
    {
        return match ($n % 20) {
            3, 11, 17 => ['pending', false],
            5, 13, 19 => ['inactive', false],
            8, 0 => ['inactive', true],
            default => ['active', false],
        };
    }

    private static function idPrefix(int $barangayIndex): string
    {
        return sprintf('SAMPLE-%02d-', $barangayIndex + 1);
    }

    private function seedSenior(Barangay $barangay, int $barangayIndex, int $n, User $leader, $benefits, string $period): void
    {
        $seed = $barangayIndex * 31 + $n * 7;
        $isMale = ($n + $barangayIndex) % 2 === 0;
        $firstNames = $isMale ? self::MALE_NAMES : self::FEMALE_NAMES;
        // Ages spread from 60 to 101 so every program threshold has samples.
        $age = 60 + (($n * 13 + $barangayIndex * 5) % 42);
        [$status, $archived] = self::statusFor($n);
        $place = "{$barangay->barangay_name}, Bulan, Sorsogon";

        $benefitType = match (true) {
            $age >= 100 => 'centenarian',
            $age >= 90 => 'nonagenarian',
            $age >= 80 => 'octogenarian',
            default => 'social_pension',
        };
        $benefit = $benefits->get($benefitType) ?? $benefits->get('social_pension');

        $senior = SeniorCitizen::withTrashed()->updateOrCreate(
            ['osca_id_number' => self::idPrefix($barangayIndex).sprintf('%03d', $n)],
            [
                'barangay_id' => $barangay->id,
                'benefit_id' => $status === 'pending' ? null : $benefit?->id,
                'encoded_by' => $leader->id,
                'last_name' => self::LAST_NAMES[$seed % count(self::LAST_NAMES)],
                'first_name' => $firstNames[($seed + $n) % count($firstNames)],
                'middle_name' => self::MIDDLE_NAMES[($seed + 3) % count(self::MIDDLE_NAMES)],
                'suffix' => $isMale && $n % 9 === 0 ? 'Sr.' : null,
                'birthdate' => today()->subYears($age)->subDays(($seed * 11) % 360)->toDateString(),
                'place_of_birth' => $n % 4 === 0 ? 'Sorsogon City, Sorsogon' : 'Bulan, Sorsogon',
                'sex' => $isMale ? 'male' : 'female',
                'contact_number' => sprintf('+639%02d%07d', 15 + ($barangayIndex % 80), $n * 104729 % 10000000),
                'address' => sprintf('Purok %d, %s', ($n % 7) + 1, $place),
                'civil_status' => self::CIVIL_STATUSES[$seed % count(self::CIVIL_STATUSES)],
                'educational_attainment' => self::EDUCATION[$seed % count(self::EDUCATION)],
                'other_skills' => self::SKILLS[$seed % count(self::SKILLS)],
                'family_composition' => sprintf('%d household members', ($seed % 6) + 1),
                'association_name' => "BSCA {$barangay->barangay_name}",
                'association_address' => $place,
                'association_membership_date' => today()->subYears(($n % 8) + 1)->subDays($n * 9)->toDateString(),
                'association_position' => self::POSITIONS[$n % count(self::POSITIONS)],
                'living_arrangement' => self::LIVING[$seed % count(self::LIVING)],
                'registration_date' => today()->subDays($status === 'pending' ? $n : 30 + $n * 23)->toDateString(),
                'status' => $status,
            ],
        );

        if ($archived) {
            $senior->trashed() || $senior->delete();
        } elseif ($senior->trashed()) {
            $senior->restore();
        }

        // Pending registrations have not been validated, so they have no benefit records yet.
        if ($status === 'pending' || ! $benefit) {
            return;
        }

        $transactionStatus = match (true) {
            $status === 'inactive' => 'failed',
            $n % 4 === 0 => 'pending',
            default => 'released',
        };

        BenefitTransaction::updateOrCreate(
            ['senior_citizen_id' => $senior->id, 'benefit_id' => $benefit->id, 'period_label' => $period],
            [
                'distributed_by' => $leader->id,
                'created_by' => $leader->id,
                'updated_by' => $leader->id,
                'date_distributed' => $transactionStatus === 'released' ? today()->subDays($n)->toDateString() : null,
                'amount' => $benefit->amount ?? 0,
                'status' => $transactionStatus,
                'reference_number' => $transactionStatus === 'released' ? sprintf('SAMPLE-REF-%02d%03d', $barangayIndex + 1, $n) : null,
                'remarks' => match ($transactionStatus) {
                    'failed' => 'Sample: not released, senior is inactive.',
                    'pending' => 'Sample: awaiting release.',
                    default => 'Sample: released benefit.',
                },
            ],
        );
    }
}
