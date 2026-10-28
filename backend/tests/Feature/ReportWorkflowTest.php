<?php

namespace Tests\Feature;

use App\Models\AnalyticsReport;
use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\Notification;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Barangay $zone1;

    private Barangay $zone2;

    private User $admin;

    private User $head;

    private User $leader;

    private User $otherLeader;

    protected function setUp(): void
    {
        parent::setUp();
        $this->zone1 = Barangay::create(['barangay_name' => 'Zone 1']);
        $this->zone2 = Barangay::create(['barangay_name' => 'Zone 2']);
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->head = User::factory()->create(['role' => 'head']);
        $this->president = User::factory()->create(['role' => 'president', 'barangay_id' => $this->zone1->id]);
        $this->otherLeader = User::factory()->create(['role' => 'president', 'barangay_id' => $this->zone2->id]);

        // More than one page of seniors, so the report must not stop at the first 50.
        foreach (range(1, 55) as $number) {
            $this->createSenior($number <= 40 ? $this->zone1 : $this->zone2, "OSCA-{$number}", $number === 1 ? 'pending' : 'active');
        }
        $benefit = Benefit::create([
            'benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60,
            'amount' => 3000, 'funding_source' => 'national', 'schedule' => 'quarterly', 'status' => 'active',
        ]);
        $senior = SeniorCitizen::where('osca_id_number', 'OSCA-2')->first();
        foreach (['released' => 'Q1', 'pending' => 'Q2', 'failed' => 'Q3'] as $status => $period) {
            BenefitTransaction::create([
                'senior_citizen_id' => $senior->id, 'benefit_id' => $benefit->id, 'distributed_by' => $this->admin->id,
                'amount' => 3000, 'status' => $status, 'period_label' => $period,
            ]);
        }
    }

    public function test_municipal_summary_counts_every_record_and_goes_through_review(): void
    {
        $id = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/reports', ['report_type' => 'Municipal Summary', 'remarks' => 'Q3 summary'])
            ->assertCreated()
            ->assertJsonPath('status', 'draft')
            ->assertJsonPath('total_registered', 55)
            ->assertJsonPath('snapshot.totals.active', 54)
            ->assertJsonPath('snapshot.totals.pending', 1)
            ->assertJsonPath('snapshot.barangays.0.barangay', 'Zone 1')
            ->assertJsonPath('snapshot.barangays.0.registered', 40)
            ->assertJsonPath('snapshot.barangays.0.released', 1)
            ->assertJsonPath('snapshot.barangays.0.pending_release', 1)
            ->assertJsonPath('snapshot.barangays.1.registered', 15)
            ->assertJsonPath('snapshot.benefits.0.released', 1)
            ->assertJsonPath('snapshot.benefits.0.pending', 1)
            ->assertJsonPath('snapshot.benefits.0.not_released', 1)
            ->json('id');
        $this->assertDatabaseHas('notifications', ['recipient_account_id' => $this->head->id, 'source_type' => 'report', 'source_id' => $id]);

        // The Head returns it, the Admin revises it, then the Head approves and publishes it.
        $this->actingAs($this->head, 'sanctum')->patchJson("/api/reports/{$id}", ['status' => 'returned'])->assertUnprocessable();
        $this->actingAs($this->head, 'sanctum')
            ->patchJson("/api/reports/{$id}", ['status' => 'returned', 'review_remarks' => 'Add Q3 releases.'])
            ->assertOk()
            ->assertJsonPath('status', 'returned');
        $this->assertDatabaseHas('notifications', ['recipient_account_id' => $this->admin->id, 'source_id' => $id]);
        $this->actingAs($this->head, 'sanctum')->patchJson("/api/reports/{$id}", ['status' => 'draft'])->assertForbidden();
        $this->actingAs($this->admin, 'sanctum')->patchJson("/api/reports/{$id}", ['status' => 'draft'])->assertOk()->assertJsonPath('status', 'draft');
        $this->actingAs($this->admin, 'sanctum')->patchJson("/api/reports/{$id}", ['status' => 'approved'])->assertForbidden();
        $this->actingAs($this->head, 'sanctum')->patchJson("/api/reports/{$id}", ['status' => 'approved'])->assertOk();
        $this->actingAs($this->admin, 'sanctum')->patchJson("/api/reports/{$id}", ['status' => 'published'])->assertForbidden();

        Notification::query()->delete();
        $this->actingAs($this->head, 'sanctum')
            ->patchJson("/api/reports/{$id}", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('status', 'published')
            ->assertJsonPath('publisher.id', $this->head->id);
        foreach ([$this->admin, $this->president, $this->otherLeader] as $recipient) {
            $this->assertDatabaseHas('notifications', ['recipient_account_id' => $recipient->id, 'source_id' => $id]);
        }

        // A later record does not change the published figures.
        $this->createSenior($this->zone1, 'OSCA-NEW');
        $this->actingAs($this->president, 'sanctum')->getJson("/api/reports/{$id}")->assertOk()->assertJsonPath('snapshot.totals.total', 55);
    }

    public function test_only_admin_generates_a_barangay_summary_with_its_roster(): void
    {
        $this->actingAs($this->head, 'sanctum')
            ->postJson('/api/reports', ['report_type' => 'Barangay Summary', 'barangay_id' => $this->zone2->id])
            ->assertForbidden();
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/reports', ['report_type' => 'Barangay Summary'])->assertUnprocessable();
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/reports', ['report_type' => 'Barangay Summary', 'barangay_id' => $this->zone2->id])
            ->assertCreated()
            ->assertJsonPath('snapshot.scope', 'Barangay Zone 2')
            ->assertJsonPath('total_registered', 15)
            ->assertJsonCount(15, 'snapshot.seniors')
            ->assertJsonCount(1, 'snapshot.barangays');
    }

    public function test_benefit_distribution_lists_each_release(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/reports', ['report_type' => 'Benefit Distribution'])
            ->assertCreated()
            ->assertJsonCount(3, 'snapshot.distribution')
            ->assertJsonPath('snapshot.distribution.0.osca_id', 'OSCA-2')
            ->assertJsonPath('snapshot.distribution.0.status', 'released')
            ->assertJsonPath('snapshot.distribution.2.status', 'not_released');
    }

    public function test_leaders_only_see_published_reports_meant_for_them(): void
    {
        $draft = $this->report('Municipal Summary', null, 'draft');
        $municipal = $this->report('Municipal Summary', null, 'published');
        $ownBarangay = $this->report('Barangay Summary', $this->zone1->id, 'published');
        $otherBarangay = $this->report('Barangay Summary', $this->zone2->id, 'published');
        $distribution = $this->report('Benefit Distribution', null, 'published');

        $ids = collect($this->actingAs($this->president, 'sanctum')->getJson('/api/reports')->assertOk()->json())->pluck('id');
        $this->assertEqualsCanonicalizing([$municipal->id, $ownBarangay->id], $ids->all());

        foreach ([$draft, $otherBarangay, $distribution] as $hidden) {
            $this->actingAs($this->president, 'sanctum')->getJson("/api/reports/{$hidden->id}")->assertNotFound();
        }
        $this->actingAs($this->president, 'sanctum')->postJson('/api/reports', ['report_type' => 'Municipal Summary'])->assertForbidden();
    }

    public function test_viewing_an_older_report_without_figures_fills_them_in(): void
    {
        $report = $this->report('Municipal Senior Citizen Registry', null, 'approved');
        $report->update(['snapshot' => null]);

        $this->actingAs($this->head, 'sanctum')
            ->getJson("/api/reports/{$report->id}")
            ->assertOk()
            ->assertJsonPath('snapshot.totals.total', 55)
            ->assertJsonPath('snapshot.scope', 'Municipality of Bulan');
        $this->assertNotNull($report->fresh()->snapshot);
    }

    private function report(string $type, ?int $barangayId, string $status): AnalyticsReport
    {
        return AnalyticsReport::create([
            'generated_by' => $this->admin->id, 'barangay_id' => $barangayId, 'generated_date' => today(),
            'report_type' => $type, 'total_registered' => 0, 'status' => $status, 'snapshot' => [],
        ]);
    }

    private function createSenior(Barangay $barangay, string $oscaId, string $status = 'active'): SeniorCitizen
    {
        return SeniorCitizen::create([
            'osca_id_number' => $oscaId,
            'barangay_id' => $barangay->id,
            'encoded_by' => $this->admin->id,
            'first_name' => 'Senior',
            'last_name' => $oscaId,
            'birthdate' => now()->subYears(70)->toDateString(),
            'sex' => 'female',
            'registration_date' => now()->toDateString(),
            'status' => $status,
        ]);
    }
}
