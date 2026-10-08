<?php

namespace Tests\Feature;

use App\Models\AnalyticsReport;
use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\Message;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TestCaseFixesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $head;
    private User $leader;
    private Benefit $grant;

    protected function setUp(): void
    {
        parent::setUp();
        $barangay = Barangay::create(['barangay_name' => 'Zone 1', 'municipality' => 'Bulan', 'province' => 'Sorsogon']);
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        $this->leader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $barangay->id]);
        Benefit::create(['benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60, 'amount' => 3000, 'funding_source' => 'national', 'schedule' => 'quarterly', 'description' => 'Pension', 'status' => 'active']);
        $this->grant = Benefit::create(['benefit_name' => 'Octogenarian Grant', 'benefit_type' => 'octogenarian', 'min_age' => 80, 'max_age' => 85, 'amount' => 10000, 'funding_source' => 'national', 'schedule' => 'one_time', 'description' => 'Grant', 'status' => 'active']);
    }

    private function senior(): SeniorCitizen
    {
        // Seniors are registered by their barangay's BSCA President.
        $response = $this->actingAs($this->leader, 'sanctum')->postJson('/api/seniors', [
            'privacy_consent' => true, 'privacy_consent_version' => '2026-10-07', 'first_name' => 'Juan', 'last_name' => 'Dela Cruz',
            'birthdate' => '1945-01-01', 'sex' => 'male', 'contact_number' => '09171234567', 'barangay' => 'Zone 1', 'benefit' => 'Social Pension',
        ])->assertCreated();

        return SeniorCitizen::findOrFail($response->json('id'));
    }

    public function test_head_approval_applies_a_leader_edit_request(): void
    {
        $senior = $this->senior();
        $request = $this->actingAs($this->leader, 'sanctum')->postJson('/api/senior-edit-requests', [
            'senior_id' => $senior->osca_id_number,
            'changes' => ['first_name' => 'Pedro', 'last_name' => 'Dela Cruz', 'birthdate' => '1945-01-01', 'barangay' => 'Zone 1', 'benefit' => 'Social Pension'],
        ])->assertCreated()->assertJsonPath('senior.id', $senior->id);

        $this->actingAs($this->head, 'sanctum')->getJson('/api/senior-edit-requests')
            ->assertOk()->assertJsonPath('0.senior.osca_id_number', $senior->osca_id_number);
        $this->patchJson("/api/senior-edit-requests/{$request->json('id')}", ['status' => 'approved'])
            ->assertOk()->assertJsonPath('status', 'approved');

        $this->assertSame('Pedro', $senior->fresh()->first_name);
    }

    public function test_one_time_grant_cannot_be_recorded_twice_under_another_period_label(): void
    {
        $senior = $this->senior();
        $release = fn (string $label, string $status = 'pending') => $this->actingAs($this->admin, 'sanctum')->postJson('/api/benefit-transactions', [
            'senior_citizen_id' => $senior->id, 'benefit_id' => $this->grant->id, 'amount' => 10000, 'period_label' => $label, 'status' => $status,
        ]);

        $release('First attempt', 'failed')->assertCreated();
        $release('One-time')->assertCreated();
        $release('2027 grant')->assertStatus(422)->assertJsonPath('message', 'This senior already has this one-time grant on record.');
    }

    public function test_report_moves_from_draft_to_approved_to_published(): void
    {
        $this->senior();
        $report = $this->actingAs($this->head, 'sanctum')->postJson('/api/reports', ['report_type' => 'Registry'])->assertForbidden();
        $report = $this->actingAs($this->admin, 'sanctum')->postJson('/api/reports', ['report_type' => 'Registry'])
            ->assertCreated()->assertJsonPath('status', 'draft')->assertJsonPath('total_registered', 1);
        $id = $report->json('id');

        $this->patchJson("/api/reports/{$id}", ['status' => 'approved'])->assertForbidden();
        $this->patchJson("/api/reports/{$id}", ['status' => 'published'])->assertStatus(422);
        $this->actingAs($this->head, 'sanctum')->patchJson("/api/reports/{$id}", ['status' => 'approved'])
            ->assertOk()->assertJsonPath('status', 'approved')->assertJsonPath('approver.id', $this->head->id);
        $this->actingAs($this->admin, 'sanctum')->patchJson("/api/reports/{$id}", ['status' => 'published'])
            ->assertOk()->assertJsonPath('status', 'published');

        $this->assertNotNull(AnalyticsReport::findOrFail($id)->published_at);
        $this->actingAs($this->leader, 'sanctum')->getJson('/api/reports')->assertForbidden();
        $this->actingAs($this->head, 'sanctum')->getJson('/api/reports')->assertOk()->assertJsonCount(1);
    }

    public function test_messages_can_carry_an_attachment_without_text(): void
    {
        Storage::fake('public');
        $sent = $this->actingAs($this->leader, 'sanctum')->post('/api/messages', [
            'recipient_id' => $this->head->id, 'subject' => 'Payout', 'attachment' => UploadedFile::fake()->image('list.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('attachment_name', 'list.jpg');

        Storage::disk('public')->assertExists($sent->json('attachment_path'));
        $this->postJson('/api/messages', ['recipient_id' => $this->head->id, 'subject' => 'Empty'])
            ->assertStatus(422)->assertJsonValidationErrors('message');
        $this->postJson('/api/messages', ['recipient_id' => $this->head->id, 'subject' => 'Bad', 'attachment' => UploadedFile::fake()->create('run.exe', 10)])
            ->assertStatus(422)->assertJsonValidationErrors('attachment');

        // Deleting hides the conversation for the leader only; the head still has it.
        $this->deleteJson("/api/messages/conversations/{$this->head->id}")->assertNoContent();
        $this->getJson('/api/messages')->assertJsonCount(0, 'data');
        Storage::disk('public')->assertExists($sent->json('attachment_path'));
        $this->actingAs($this->head, 'sanctum')->getJson('/api/messages')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.attachment_name', 'list.jpg');

        // Once both have deleted it, the message and its attachment are gone.
        $this->deleteJson("/api/messages/conversations/{$this->leader->id}")->assertNoContent();
        Storage::disk('public')->assertMissing($sent->json('attachment_path'));
        $this->assertSame(0, Message::count());
    }
}
