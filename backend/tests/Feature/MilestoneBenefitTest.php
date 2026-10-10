<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitRelease;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MilestoneBenefitTest extends TestCase
{
    use RefreshDatabase;

    private User $head;

    private Barangay $barangay;

    private Benefit $pension;

    private Benefit $octogenarian;

    protected function setUp(): void
    {
        parent::setUp();

        $this->head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        $this->barangay = Barangay::create(['barangay_name' => 'Calpi']);
        $common = ['funding_source' => 'national', 'status' => 'active'];
        $this->pension = Benefit::create([...$common, 'benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60, 'amount' => 3000, 'schedule' => 'quarterly']);
        $this->octogenarian = Benefit::create([...$common, 'benefit_name' => 'Octogenarian Grant', 'benefit_type' => 'octogenarian', 'min_age' => 80, 'max_age' => 85, 'amount' => 10000, 'schedule' => 'one_time']);
    }

    private function senior(string $name, string $birthdate, Benefit $benefit): SeniorCitizen
    {
        return SeniorCitizen::create([
            'osca_id_number' => $name,
            'barangay_id' => $this->barangay->id,
            'encoded_by' => $this->head->id,
            'first_name' => 'Senior',
            'last_name' => $name,
            'birthdate' => $birthdate,
            'sex' => 'female',
            'benefit_id' => $benefit->id,
            'registration_date' => '2026-01-01',
            'status' => 'active',
        ]);
    }

    /** @return list<string> */
    private function release(Benefit $benefit, string $period): array
    {
        $id = $this->actingAs($this->head, 'sanctum')->postJson('/api/benefit-releases', [
            'benefit_id' => $benefit->id,
            'period_label' => $period,
            'barangay_ids' => [$this->barangay->id],
            'release_date' => '2027-01-15',
            'status' => 'scheduled',
        ])->assertCreated()->json('id');

        return BenefitRelease::find($id)->transactions()->with('senior')->get()
            ->pluck('senior.osca_id_number')->sort()->values()->all();
    }

    public function test_milestone_seniors_also_receive_social_pension(): void
    {
        $this->senior('PENSION', '1955-01-01', $this->pension);
        $this->senior('OCTO', '1947-01-01', $this->octogenarian);

        $this->assertSame(['OCTO', 'PENSION'], $this->release($this->pension, 'Q1 2027'));
    }

    public function test_octogenarian_grant_goes_only_to_exact_ages_80_and_85(): void
    {
        // Ages on the 2027-01-15 release date.
        $this->senior('AGE-79', '1947-06-01', $this->pension);
        $this->senior('AGE-80', '1947-01-01', $this->pension);
        $this->senior('AGE-82', '1945-01-01', $this->octogenarian);
        $this->senior('AGE-85', '1942-01-01', $this->octogenarian);
        $this->senior('AGE-86', '1940-06-01', $this->octogenarian);

        $this->assertSame(['AGE-80', 'AGE-85'], $this->release($this->octogenarian, '2027'));
    }

    public function test_a_seniors_records_show_their_release_date(): void
    {
        $this->senior('AGE-80', '1947-01-01', $this->pension);
        $this->senior('OTHER', '1955-01-01', $this->pension);
        $this->release($this->octogenarian, '2027');

        $this->actingAs($this->head, 'sanctum')
            ->getJson('/api/benefit-transactions?senior=AGE-80')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.benefit.benefit_name', 'Octogenarian Grant')
            ->assertJsonPath('data.0.benefit_release.release_date', fn ($date) => str_starts_with($date, '2027-01-15'));
    }

    public function test_a_grant_paid_at_80_does_not_block_the_one_at_85(): void
    {
        $senior = $this->senior('AGE-85', '1942-01-01', $this->octogenarian);
        $paidRecently = $this->senior('PAID-85', '1942-01-01', $this->octogenarian);
        foreach ([[$senior, '2022-03-01'], [$paidRecently, '2026-12-01']] as [$who, $date]) {
            BenefitTransaction::create([
                'senior_citizen_id' => $who->id,
                'benefit_id' => $this->octogenarian->id,
                'distributed_by' => $this->head->id,
                'date_distributed' => $date,
                'amount' => 10000,
                'period_label' => 'earlier',
                'status' => 'released',
            ]);
        }

        $this->assertSame(['AGE-85'], $this->release($this->octogenarian, '2027'));
    }
}
