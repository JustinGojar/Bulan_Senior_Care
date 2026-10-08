<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\Notification;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BenefitReleaseBatchTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Benefit $pension;

    private Barangay $calpi;

    private Barangay $gate;

    private Barangay $sigad;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->calpi = Barangay::create(['barangay_name' => 'Calpi']);
        $this->gate = Barangay::create(['barangay_name' => 'Gate']);
        $this->sigad = Barangay::create(['barangay_name' => 'Sigad']);
        $this->pension = Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'status' => 'active',
        ]);
    }

    private function schedule(array $barangayIds, string $date = '2027-01-15')
    {
        return $this->actingAs($this->admin, 'sanctum')->postJson('/api/benefit-releases', [
            'benefit_id' => $this->pension->id,
            'period_label' => 'January 2027',
            'barangay_ids' => $barangayIds,
            'release_date' => $date,
            'status' => 'scheduled',
        ]);
    }

    public function test_a_period_can_be_released_in_barangay_batches(): void
    {
        $this->schedule([$this->calpi->id, $this->gate->id])
            ->assertCreated()
            ->assertJsonPath('amount', '3000.00')
            ->assertJsonCount(2, 'barangays');

        $this->schedule([$this->sigad->id], '2027-01-22')->assertCreated();
    }

    public function test_a_barangay_cannot_be_in_two_batches_for_the_same_period(): void
    {
        $this->schedule([$this->calpi->id])->assertCreated();

        $this->schedule([$this->gate->id, $this->calpi->id], '2027-01-22')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Already in another release batch for January 2027: Calpi.');
    }

    public function test_at_least_one_barangay_is_required(): void
    {
        $this->schedule([])->assertStatus(422)->assertJsonValidationErrors('barangay_ids');
    }

    private function senior(string $oscaId, Barangay $barangay, string $status = 'active'): SeniorCitizen
    {
        $senior = SeniorCitizen::create([
            'osca_id_number' => $oscaId,
            'barangay_id' => $barangay->id,
            'encoded_by' => $this->admin->id,
            'first_name' => 'Senior',
            'last_name' => $oscaId,
            'birthdate' => '1950-01-01',
            'sex' => 'female',
            'benefit_id' => $this->pension->id,
            'registration_date' => '2026-01-01',
            'status' => $status,
        ]);

        return $senior;
    }

    public function test_saving_a_batch_lists_the_seniors_who_receive_on_that_day(): void
    {
        $this->senior('CALPI-1', $this->calpi);
        $this->senior('CALPI-2', $this->calpi, 'inactive');
        $this->senior('GATE-1', $this->gate);
        $this->senior('SIGAD-1', $this->sigad);

        $releaseId = $this->schedule([$this->calpi->id, $this->gate->id])
            ->assertCreated()
            ->assertJsonPath('transactions_count', 2)
            ->json('id');

        $roster = $this->actingAs($this->admin, 'sanctum')->getJson("/api/benefit-releases/{$releaseId}")
            ->assertOk()
            ->assertJsonCount(2, 'transactions')
            ->json('transactions');
        $this->assertEqualsCanonicalizing(['CALPI-1', 'GATE-1'], array_column(array_column($roster, 'senior'), 'osca_id_number'));
        $this->assertSame(['pending', 'pending'], array_column($roster, 'status'));
        $this->assertSame(['January 2027', 'January 2027'], array_column($roster, 'period_label'));

        // A leader sees only their own barangay's seniors in the batch.
        /** @var User $calpiLeader */
        $calpiLeader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->calpi->id]);
        $this->actingAs($calpiLeader, 'sanctum')->getJson("/api/benefit-releases/{$releaseId}")
            ->assertOk()
            ->assertJsonCount(1, 'transactions')
            ->assertJsonPath('transactions.0.senior.osca_id_number', 'CALPI-1');
        /** @var User $sigadLeader */
        $sigadLeader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->sigad->id]);
        $this->actingAs($sigadLeader, 'sanctum')->getJson("/api/benefit-releases/{$releaseId}")->assertForbidden();
    }

    public function test_only_leaders_of_the_batch_are_notified_and_see_it(): void
    {
        /** @var User $calpiLeader */
        $calpiLeader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->calpi->id]);
        /** @var User $sigadLeader */
        $sigadLeader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->sigad->id]);

        $this->schedule([$this->calpi->id])->assertCreated();

        $this->assertSame(1, Notification::where('recipient_account_id', $calpiLeader->id)->count());
        $this->assertSame(0, Notification::where('recipient_account_id', $sigadLeader->id)->count());
        $this->actingAs($calpiLeader, 'sanctum')->getJson('/api/benefit-releases')->assertJsonCount(1, 'data');
        $this->actingAs($sigadLeader, 'sanctum')->getJson('/api/benefit-releases')->assertJsonCount(0, 'data');
    }

    public function test_age_based_batches_list_seniors_by_age_on_the_release_date(): void
    {
        $octogenarian = Benefit::create([
            'benefit_name' => 'Octogenarian Grant',
            'benefit_type' => 'octogenarian',
            'min_age' => 80,
            'max_age' => 85,
            'amount' => 10000,
            'funding_source' => 'national',
            'schedule' => 'one_time',
            'status' => 'active',
        ]);
        $releaseDate = '2027-01-15';
        // All are registered on Social Pension; the grant goes by age alone.
        $turns80OnTheDay = $this->senior('AGE-80', $this->calpi);
        $turns80OnTheDay->update(['birthdate' => '1947-01-15']);
        $aged85 = $this->senior('AGE-85', $this->calpi);
        $aged85->update(['birthdate' => '1941-06-01']);
        $this->senior('AGE-79', $this->calpi)->update(['birthdate' => '1947-01-16']);
        $this->senior('AGE-86', $this->calpi)->update(['birthdate' => '1941-01-15']);
        $alreadyPaid = $this->senior('AGE-PAID', $this->calpi);
        $alreadyPaid->update(['birthdate' => '1944-03-01']);
        $alreadyPaid->benefits()->attach($octogenarian->id, [
            'distributed_by' => $this->admin->id,
            'amount' => 10000,
            'status' => 'released',
            'period_label' => 'March 2026',
        ]);

        $releaseId = $this->actingAs($this->admin, 'sanctum')->postJson('/api/benefit-releases', [
            'benefit_id' => $octogenarian->id,
            'period_label' => 'January 2027',
            'barangay_ids' => [$this->calpi->id],
            'release_date' => $releaseDate,
            'status' => 'scheduled',
        ])->assertCreated()->json('id');

        $listed = BenefitTransaction::where('benefit_release_id', $releaseId)
            ->with('senior:id,osca_id_number')
            ->get()
            ->pluck('senior.osca_id_number')
            ->sort()
            ->values()
            ->all();
        $this->assertSame(['AGE-80', 'AGE-85'], $listed);
    }

    public function test_release_queue_filters_by_period_and_lists_periods(): void
    {
        $this->senior('CALPI-1', $this->calpi);
        $this->schedule([$this->calpi->id], '2027-01-15')->assertCreated();
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/benefit-releases', [
            'benefit_id' => $this->pension->id,
            'period_label' => 'February 2027',
            'barangay_ids' => [$this->calpi->id],
            'release_date' => '2027-02-15',
            'status' => 'scheduled',
        ])->assertCreated();

        $this->actingAs($this->admin, 'sanctum')->getJson('/api/benefit-transactions')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('periods', ['February 2027', 'January 2027']);
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/benefit-transactions?period='.urlencode('January 2027'))
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.period_label', 'January 2027');
    }

    public function test_release_history_filters_by_program_and_date(): void
    {
        $this->schedule([$this->calpi->id], '2027-01-15')->assertCreated();
        $this->schedule([$this->gate->id], '2027-01-29')->assertCreated();
        $other = Benefit::create([
            'benefit_name' => 'Octogenarian Grant',
            'benefit_type' => 'octogenarian',
            'min_age' => 80,
            'amount' => 10000,
            'funding_source' => 'national',
            'schedule' => 'one_time',
            'status' => 'active',
        ]);
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/benefit-releases', [
            'benefit_id' => $other->id,
            'period_label' => 'January 2027',
            'barangay_ids' => [$this->sigad->id],
            'release_date' => '2027-01-20',
            'status' => 'scheduled',
        ])->assertCreated();

        $this->actingAs($this->admin, 'sanctum')->getJson("/api/benefit-releases?benefit_id={$this->pension->id}")
            ->assertJsonCount(2, 'data');
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/benefit-releases?date_from=2027-01-16&date_to=2027-01-31')
            ->assertJsonCount(2, 'data');
        $this->actingAs($this->admin, 'sanctum')->getJson("/api/benefit-releases?benefit_id={$this->pension->id}&date_from=2027-01-15&date_to=2027-01-15")
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.release_date', '2027-01-15T00:00:00.000000Z');
    }

    public function test_completing_a_batch_records_unclaimed_seniors_as_not_received(): void
    {
        $this->senior('CALPI-1', $this->calpi);
        $this->senior('CALPI-2', $this->calpi);
        $releaseId = $this->schedule([$this->calpi->id], now()->toDateString())->json('id');
        $first = BenefitTransaction::where('benefit_release_id', $releaseId)->orderBy('id')->firstOrFail();
        $first->update(['status' => 'released', 'date_distributed' => now()->toDateString()]);

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/benefit-releases/{$releaseId}/complete")
            ->assertOk()
            ->assertJsonPath('status', 'released');

        $statuses = BenefitTransaction::where('benefit_release_id', $releaseId)->orderBy('id')->pluck('status')->all();
        $this->assertSame(['released', 'failed'], $statuses);
        $this->assertStringStartsWith('Did not claim', BenefitTransaction::where('benefit_release_id', $releaseId)->where('status', 'failed')->value('remarks'));

        // Completed batches stay closed, and the next month's batch lists the senior again.
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/benefit-releases/{$releaseId}/complete")->assertStatus(422);
    }

    public function test_a_batch_cannot_be_completed_before_its_release_date(): void
    {
        $releaseId = $this->schedule([$this->calpi->id], now()->addDays(3)->toDateString())->json('id');

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/benefit-releases/{$releaseId}/complete")->assertStatus(422);
    }

    public function test_documents_are_kept_with_the_batch_and_scoped_to_its_barangays(): void
    {
        Storage::fake('local');
        $releaseId = $this->schedule([$this->calpi->id])->json('id');
        /** @var User $calpiLeader */
        $calpiLeader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->calpi->id]);
        /** @var User $sigadLeader */
        $sigadLeader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->sigad->id]);

        $documentId = $this->actingAs($calpiLeader, 'sanctum')->post("/api/benefit-releases/{$releaseId}/documents", [
            'documents' => [UploadedFile::fake()->create('signed-list.pdf', 50, 'application/pdf')],
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('documents.0.original_name', 'signed-list.pdf')
            ->json('documents.0.id');

        $this->actingAs($this->admin, 'sanctum')->get("/api/benefit-releases/{$releaseId}/documents/{$documentId}")->assertOk();
        $this->actingAs($sigadLeader, 'sanctum')->get("/api/benefit-releases/{$releaseId}/documents/{$documentId}")->assertForbidden();
        $this->actingAs($sigadLeader, 'sanctum')->deleteJson("/api/benefit-releases/{$releaseId}/documents/{$documentId}")->assertForbidden();

        $this->actingAs($calpiLeader, 'sanctum')->deleteJson("/api/benefit-releases/{$releaseId}/documents/{$documentId}")
            ->assertOk()
            ->assertJsonCount(0, 'documents');
    }
}
