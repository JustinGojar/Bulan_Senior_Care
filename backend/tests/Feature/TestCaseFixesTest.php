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
        $this->president = User::factory()->create(['role' => 'president', 'status' => 'active', 'barangay_id' => $barangay->id]);
        Benefit::create(['benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60, 'amount' => 3000, 'funding_source' => 'national', 'schedule' => 'quarterly', 'description' => 'Pension', 'status' => 'active']);
        $this->grant = Benefit::create(['benefit_name' => 'Octogenarian Grant', 'benefit_type' => 'octogenarian', 'min_age' => 80, 'max_age' => 85, 'amount' => 10000, 'funding_source' => 'national', 'schedule' => 'one_time', 'description' => 'Grant', 'status' => 'active']);
    }

    private function senior(): SeniorCitizen
    {
        // Seniors are registered by their barangay's BSCA President.
        $response = $this->actingAs($this->president, 'sanctum')->postJson('/api/seniors', [
            'privacy_consent' => true, 'privacy_consent_version' => '2026-10-07', 'first_name' => 'Juan', 'last_name' => 'Dela Cruz',
            'birthdate' => '1945-01-01', 'sex' => 'male', 'contact_number' => '09171234567', 'barangay' => 'Zone 1', 'benefit' => 'Social Pension',
        ])->assertCreated();

        return SeniorCitizen::findOrFail($response->json('id'));
    }

    public function test_head_approval_applies_a_leader_edit_request(): void
    {
        $senior = $this->senior();
        $request = $this->actingAs($this->president, 'sanctum')->postJson('/api/senior-edit-requests', [
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
        $this->actingAs($this->president, 'sanctum')->postJson('/api/reports', ['report_type' => 'Municipal Summary'])->assertForbidden();
        $this->actingAs($this->head, 'sanctum')->postJson('/api/reports', ['report_type' => 'Municipal Summary'])->assertForbidden();
        $report = $this->actingAs($this->admin, 'sanctum')->postJson('/api/reports', ['report_type' => 'Municipal Summary'])
            ->assertCreated()->assertJsonPath('status', 'draft')->assertJsonPath('total_registered', 1);
        $id = $report->json('id');

        $this->patchJson("/api/reports/{$id}", ['status' => 'approved'])->assertForbidden();
        $this->patchJson("/api/reports/{$id}", ['status' => 'published'])->assertForbidden();
        $this->actingAs($this->president, 'sanctum')->getJson('/api/reports')->assertOk()->assertJsonCount(0);
        $this->actingAs($this->head, 'sanctum')->patchJson("/api/reports/{$id}", ['status' => 'published'])->assertStatus(422);
        $this->patchJson("/api/reports/{$id}", ['status' => 'approved'])
            ->assertOk()->assertJsonPath('status', 'approved')->assertJsonPath('approver.id', $this->head->id);
        $this->patchJson("/api/reports/{$id}", ['status' => 'published'])
            ->assertOk()->assertJsonPath('status', 'published');

        $this->assertNotNull(AnalyticsReport::findOrFail($id)->published_at);
        $this->actingAs($this->president, 'sanctum')->getJson('/api/reports')->assertOk()->assertJsonCount(1);
        $this->actingAs($this->head, 'sanctum')->getJson('/api/reports')->assertOk()->assertJsonCount(1);
    }

    public function test_messages_can_carry_an_attachment_without_text(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $sent = $this->actingAs($this->president, 'sanctum')->post('/api/messages', [
            'recipient_id' => $this->head->id, 'subject' => 'Payout', 'attachment' => UploadedFile::fake()->image('list.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('attachment_name', 'list.jpg');

        Storage::disk('local')->assertExists($sent->json('attachment_path'));
        Storage::disk('public')->assertMissing($sent->json('attachment_path'));
        $this->postJson('/api/messages', ['recipient_id' => $this->head->id, 'subject' => 'Empty'])
            ->assertStatus(422)->assertJsonValidationErrors('message');
        $this->postJson('/api/messages', ['recipient_id' => $this->head->id, 'subject' => 'Bad', 'attachment' => UploadedFile::fake()->create('run.exe', 10)])
            ->assertStatus(422)->assertJsonValidationErrors('attachment');

        // Deleting hides the conversation for the president only; the head still has it.
        $this->deleteJson("/api/messages/conversations/{$this->head->id}")->assertNoContent();
        $this->getJson('/api/messages')->assertJsonCount(0, 'data');
        Storage::disk('local')->assertExists($sent->json('attachment_path'));
        $this->actingAs($this->head, 'sanctum')->getJson('/api/messages')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.attachment_name', 'list.jpg');

        // Once both have deleted it, the message and its attachment are gone.
        $this->deleteJson("/api/messages/conversations/{$this->president->id}")->assertNoContent();
        Storage::disk('local')->assertMissing($sent->json('attachment_path'));
        $this->assertSame(0, Message::count());
    }

    public function test_message_attachment_opens_only_for_its_sender_and_recipient(): void
    {
        Storage::fake('local');
        $outsider = User::factory()->create(['role' => 'head', 'status' => 'active']);
        $sent = $this->actingAs($this->president, 'sanctum')->post('/api/messages', [
            'recipient_id' => $this->head->id, 'subject' => 'Payout', 'attachment' => UploadedFile::fake()->create('list.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();
        $url = "/api/messages/{$sent->json('id')}/attachment";

        $this->getJson($url)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->actingAs($this->head, 'sanctum')->getJson($url)->assertOk();
        $this->actingAs($outsider, 'sanctum')->getJson($url)->assertNotFound();

        // Once the president deletes the conversation, only the head can still open it.
        $this->actingAs($this->president, 'sanctum')->deleteJson("/api/messages/conversations/{$this->head->id}")->assertNoContent();
        $this->getJson($url)->assertNotFound();
        $this->actingAs($this->head, 'sanctum')->getJson($url)->assertOk();
    }

    public function test_message_attachment_requires_sign_in(): void
    {
        $message = Message::create([
            'sender_id' => $this->president->id, 'recipient_id' => $this->head->id, 'subject' => 'Payout', 'message' => '',
            'attachment_path' => 'message-attachments/list.pdf', 'attachment_name' => 'list.pdf',
        ]);

        $this->getJson("/api/messages/{$message->id}/attachment")->assertUnauthorized();
    }

    public function test_migration_moves_existing_message_attachments_to_the_private_disk(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        Storage::disk('public')->put('message-attachments/list.pdf', 'payout-list');
        Message::create([
            'sender_id' => $this->president->id, 'recipient_id' => $this->head->id, 'subject' => 'Payout', 'message' => '',
            'attachment_path' => 'message-attachments/list.pdf', 'attachment_name' => 'list.pdf',
        ]);

        $migration = require database_path('migrations/2026_10_11_140000_move_message_attachments_to_private_disk.php');
        $migration->up();

        Storage::disk('public')->assertMissing('message-attachments/list.pdf');
        $this->assertSame('payout-list', Storage::disk('local')->get('message-attachments/list.pdf'));
    }

    public function test_head_approval_applies_every_requested_field_and_keeps_omitted_ones(): void
    {
        $senior = $this->senior();
        $request = $this->actingAs($this->president, 'sanctum')->postJson('/api/senior-edit-requests', [
            'senior_id' => $senior->osca_id_number,
            'changes' => [
                'first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'birthdate' => '1945-01-01', 'barangay' => 'Zone 1',
                'benefit' => 'Social Pension', 'sex' => 'female', 'place_of_birth' => 'Bulan', 'civil_status' => 'Widowed',
                'association_name' => 'Zone 1 BSCA', 'association_position' => 'Member', 'osca_id_number' => 'HIJACK',
            ],
        ])->assertCreated();

        $this->actingAs($this->head, 'sanctum')->patchJson("/api/senior-edit-requests/{$request->json('id')}", ['status' => 'approved'])
            ->assertOk();

        $senior->refresh();
        $this->assertSame('female', $senior->sex);
        $this->assertSame('Bulan', $senior->place_of_birth);
        $this->assertSame('Widowed', $senior->civil_status);
        $this->assertSame('Zone 1 BSCA', $senior->association_name);
        $this->assertSame('Member', $senior->association_position);
        // Left out of the request, so kept; unrelated columns can never be changed this way.
        $this->assertSame('+639171234567', $senior->contact_number);
        $this->assertStringStartsWith('BSC-', $senior->osca_id_number);
    }

    public function test_edit_request_with_an_unknown_benefit_is_refused(): void
    {
        $senior = $this->senior();
        $this->actingAs($this->president, 'sanctum')->postJson('/api/senior-edit-requests', [
            'senior_id' => $senior->osca_id_number,
            'changes' => ['first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'birthdate' => '1945-01-01', 'barangay' => 'Zone 1', 'benefit' => 'Nonexistent'],
        ])->assertStatus(422)->assertJsonValidationErrors('changes.benefit');
    }

    public function test_head_account_can_be_created_and_updated_without_a_barangay(): void
    {
        $user = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/users', [
            'first_name' => 'Maria', 'last_name' => 'Santos', 'email' => 'maria@example.com', 'contact_number' => '09171234567',
            'birthdate' => '1980-01-01', 'role' => 'head', 'status' => 'active', 'password' => 'Password123!', 'password_confirmation' => 'Password123!',
        ])->assertCreated()->json('user');

        $this->putJson("/api/admin/users/{$user['id']}", [
            'name' => 'Maria Santos', 'email' => 'maria@example.com', 'role' => 'head', 'status' => 'active',
        ])->assertOk();
        $this->putJson("/api/admin/users/{$user['id']}", [
            'name' => 'Maria Santos', 'email' => 'maria@example.com', 'role' => 'president', 'status' => 'active',
        ])->assertStatus(422)->assertJsonPath('message', 'A barangay is required for a Barangay President.');
    }

    public function test_senior_update_refuses_an_unknown_barangay(): void
    {
        $senior = $this->senior();
        $this->actingAs($this->admin, 'sanctum')->putJson("/api/seniors/{$senior->osca_id_number}", ['barangay' => 'Nowhere'])
            ->assertStatus(422)->assertJsonPath('message', 'The selected barangay does not exist.');
        $this->assertNotNull($senior->fresh()->barangay_id);
    }

    public function test_senior_update_accepts_an_unchanged_contact_number_in_an_older_format(): void
    {
        $senior = $this->senior();
        $senior->forceFill(['contact_number' => '(056) 311-1234'])->save();

        $this->actingAs($this->admin, 'sanctum')->putJson("/api/seniors/{$senior->osca_id_number}", [
            'contact_number' => '(056) 311-1234', 'status' => 'active',
        ])->assertOk()->assertJsonPath('status', 'active');
        $this->putJson("/api/seniors/{$senior->osca_id_number}", ['contact_number' => '(056) 311-9999'])
            ->assertStatus(422)->assertJsonValidationErrors('contact_number');
    }

    public function test_benefit_record_of_an_archived_senior_cannot_be_edited(): void
    {
        $senior = $this->senior();
        $transaction = $this->actingAs($this->admin, 'sanctum')->postJson('/api/benefit-transactions', [
            'senior_citizen_id' => $senior->id, 'benefit_id' => $this->grant->id, 'amount' => 10000, 'period_label' => 'One-time', 'status' => 'pending',
        ])->assertCreated();
        $senior->delete();

        $this->patchJson("/api/benefit-transactions/{$transaction->json('id')}", [
            'status' => 'failed', 'amount' => 10000, 'period_label' => 'One-time',
        ])->assertNotFound();
    }
}
