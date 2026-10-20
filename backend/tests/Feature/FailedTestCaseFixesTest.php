<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\Notification;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** The test cases marked failed (X): LDR-009, LDR-013, HD-005, HD-006, HD-009, HD-012, ADM-002. */
class FailedTestCaseFixesTest extends TestCase
{
    use RefreshDatabase;

    private User $head;
    private User $leader;
    private Benefit $pension;

    protected function setUp(): void
    {
        parent::setUp();
        $barangay = Barangay::create(['barangay_name' => 'Zone 1', 'municipality' => 'Bulan', 'province' => 'Sorsogon']);
        $this->head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        $this->leader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $barangay->id]);
        $this->pension = Benefit::create(['benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60, 'amount' => 3000, 'funding_source' => 'national', 'schedule' => 'quarterly', 'description' => 'Pension', 'status' => 'active']);
    }

    private function register(array $overrides = [])
    {
        return $this->actingAs($this->leader, 'sanctum')->postJson('/api/seniors', [
            'privacy_consent' => true, 'privacy_consent_version' => '2026-10-07', 'first_name' => 'Juan', 'last_name' => 'Dela Cruz',
            'birthdate' => '1945-01-01', 'sex' => 'male', 'contact_number' => '09171234567', 'barangay' => 'Zone 1', 'benefit' => 'Social Pension',
            ...$overrides,
        ]);
    }

    private function approvedSenior(): SeniorCitizen
    {
        $senior = SeniorCitizen::findOrFail($this->register()->assertCreated()->json('id'));
        $senior->update(['status' => 'active']);

        return $senior;
    }

    /** LDR-009 */
    public function test_duplicate_registration_is_blocked_ignoring_case_and_spaces(): void
    {
        $this->register()->assertCreated();

        $this->register(['first_name' => ' juan ', 'last_name' => 'DELA CRUZ'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $message) => str_starts_with($message, 'Possible duplicate'));
        $this->assertSame(1, SeniorCitizen::count());
    }

    public function test_archived_senior_also_counts_as_a_duplicate(): void
    {
        SeniorCitizen::findOrFail($this->register()->json('id'))->delete();

        $this->register()->assertStatus(422)->assertJsonPath('message', fn (string $message) => str_contains($message, 'archived record'));
    }

    /** HD-005 */
    public function test_head_rejects_a_registration_with_a_reason_the_leader_can_see(): void
    {
        $senior = SeniorCitizen::findOrFail($this->register()->json('id'));

        $this->actingAs($this->head, 'sanctum')->postJson("/api/seniors/{$senior->osca_id_number}/reject", ['reason' => 'Incomplete documents'])
            ->assertOk()
            ->assertJsonPath('inactive_reason', 'not_eligible')
            ->assertJsonPath('inactive_remarks', 'Incomplete documents');

        $this->actingAs($this->leader, 'sanctum')->getJson("/api/seniors/{$senior->osca_id_number}")
            ->assertOk()->assertJsonPath('inactive_remarks', 'Incomplete documents');
        $this->assertTrue(Notification::where('recipient_account_id', $this->leader->id)->where('source_type', 'registration_review')->where('message', 'like', '%Reason: Incomplete documents')->exists());
    }

    /** HD-006 */
    public function test_rejection_without_a_reason_is_refused(): void
    {
        $senior = SeniorCitizen::findOrFail($this->register()->json('id'));

        $this->actingAs($this->head, 'sanctum')->postJson("/api/seniors/{$senior->osca_id_number}/reject", ['reason' => '  '])
            ->assertStatus(422)->assertJsonValidationErrors(['reason' => 'Reason is required.']);
        $this->assertSame('pending', $senior->fresh()->status);
    }

    public function test_leader_cannot_reject_a_registration(): void
    {
        $senior = SeniorCitizen::findOrFail($this->register()->json('id'));

        $this->actingAs($this->leader, 'sanctum')->postJson("/api/seniors/{$senior->osca_id_number}/reject", ['reason' => 'No'])->assertForbidden();
    }

    /** LDR-013, HD-008, HD-009, HD-010 */
    public function test_benefit_request_is_verified_and_released_by_the_head(): void
    {
        $senior = $this->approvedSenior();

        $request = $this->actingAs($this->leader, 'sanctum')->postJson('/api/benefit-requests', [
            'senior_id' => $senior->osca_id_number, 'benefit_id' => $this->pension->id,
        ])->assertCreated()->assertJsonPath('status', 'for_verification');
        $id = $request->json('id');

        $this->actingAs($this->head, 'sanctum')->getJson('/api/benefit-requests?status=for_verification')
            ->assertOk()->assertJsonPath('data.0.id', $id);
        $this->patchJson("/api/benefit-requests/{$id}", ['action' => 'verify'])
            ->assertOk()->assertJsonPath('status', 'approved')->assertJsonPath('verifier.id', $this->head->id);
        $this->patchJson("/api/benefit-requests/{$id}", ['action' => 'release', 'release_date' => today()->toDateString()])
            ->assertOk()
            ->assertJsonPath('status', 'released')
            ->assertJsonPath('releaser.name', $this->head->name)
            ->assertJsonPath('release_date', fn ($date) => str_starts_with($date, today()->toDateString()));

        $transaction = BenefitTransaction::sole();
        $this->assertSame('released', $transaction->status);
        $this->assertSame($this->head->id, $transaction->distributed_by);

        // HD-010: the same benefit cannot be released twice for the same period.
        $second = $this->actingAs($this->leader, 'sanctum')->postJson('/api/benefit-requests', [
            'senior_id' => $senior->osca_id_number, 'benefit_id' => $this->pension->id,
        ])->assertCreated()->json('id');
        $this->actingAs($this->head, 'sanctum')->patchJson("/api/benefit-requests/{$second}", ['action' => 'verify'])->assertOk();
        $this->patchJson("/api/benefit-requests/{$second}", ['action' => 'release', 'release_date' => today()->toDateString()])
            ->assertStatus(422)->assertJsonPath('message', fn (string $message) => str_contains($message, 'already released'));
    }

    public function test_benefit_request_needs_an_approved_senior_and_no_open_request(): void
    {
        $pending = SeniorCitizen::findOrFail($this->register()->json('id'));
        $this->actingAs($this->leader, 'sanctum')->postJson('/api/benefit-requests', [
            'senior_id' => $pending->osca_id_number, 'benefit_id' => $this->pension->id,
        ])->assertStatus(422);

        $pending->update(['status' => 'active']);
        $this->postJson('/api/benefit-requests', ['senior_id' => $pending->osca_id_number, 'benefit_id' => $this->pension->id])->assertCreated();
        $this->postJson('/api/benefit-requests', ['senior_id' => $pending->osca_id_number, 'benefit_id' => $this->pension->id])
            ->assertStatus(422)->assertJsonPath('message', 'This senior already has an open request for this benefit.');
    }

    public function test_head_rejecting_a_benefit_request_needs_a_reason(): void
    {
        $senior = $this->approvedSenior();
        $id = $this->actingAs($this->leader, 'sanctum')->postJson('/api/benefit-requests', [
            'senior_id' => $senior->osca_id_number, 'benefit_id' => $this->pension->id,
        ])->json('id');

        $this->actingAs($this->head, 'sanctum')->patchJson("/api/benefit-requests/{$id}", ['action' => 'reject'])->assertStatus(422);
        $this->patchJson("/api/benefit-requests/{$id}", ['action' => 'reject', 'reason' => 'Not eligible'])
            ->assertOk()->assertJsonPath('status', 'rejected')->assertJsonPath('rejection_reason', 'Not eligible');
        $this->actingAs($this->leader, 'sanctum')->patchJson("/api/benefit-requests/{$id}", ['action' => 'verify'])->assertForbidden();
    }

    /** HD-012 */
    public function test_head_edits_an_announcement(): void
    {
        $announcement = Announcement::create(['created_by' => $this->head->id, 'title' => 'Payout', 'message' => 'Old', 'published_at' => now()]);

        $this->actingAs($this->head, 'sanctum')->putJson("/api/announcements/{$announcement->id}", ['title' => 'Monthly Pension Payout', 'message' => 'New details'])
            ->assertOk()->assertJsonPath('title', 'Monthly Pension Payout');
        $this->getJson('/api/announcements')->assertJsonPath('0.message', 'New details');
        $this->actingAs($this->leader, 'sanctum')->putJson("/api/announcements/{$announcement->id}", ['title' => 'X', 'message' => 'Y'])->assertForbidden();
    }

    /** ADM-002 */
    public function test_fifth_failed_login_locks_sign_in_for_a_time_limit(): void
    {
        User::factory()->create(['email' => 'admin@example.com', 'password' => 'StrongPassword123!']);
        foreach (range(1, 4) as $_) {
            $this->postJson('/api/login', ['email' => 'admin@example.com', 'password' => 'wrong'])->assertStatus(422);
        }

        $this->postJson('/api/login', ['email' => 'admin@example.com', 'password' => 'wrong'])
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonPath('retry_after', fn (int $seconds) => $seconds > 240 && $seconds <= 300);
        $this->postJson('/api/login', ['email' => 'admin@example.com', 'password' => 'StrongPassword123!'])->assertStatus(429);

        $this->travel(301)->seconds();
        $this->postJson('/api/login', ['email' => 'admin@example.com', 'password' => 'StrongPassword123!'])->assertOk();
    }
}
