<?php

namespace Tests\Feature;

use App\Jobs\DeliverAdvisory;
use App\Models\Barangay;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DocumentReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_puts_a_registration_in_review_and_the_leader_is_told_what_to_fix(): void
    {
        Bus::fake();
        DB::table('app_settings')->insert([
            'key' => 'notification_channels',
            'value' => json_encode(['email_advisories' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        [$senior, $leader] = $this->pendingRegistration();
        $leader->update(['email' => 'president@example.test']);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->postJson("/api/seniors/{$senior->osca_id_number}/review", ['note' => 'The valid ID is blurry.'])
            ->assertOk()
            ->assertJsonPath('review_note', 'The valid ID is blurry.')
            ->assertJsonPath('status', 'pending');

        $message = 'The documents for Lola Reyes (OSCA-REV-001) need to be fixed: The valid ID is blurry.';
        $this->assertDatabaseHas('notifications', [
            'recipient_account_id' => $leader->id,
            'message' => $message,
            'source_type' => 'document_review',
            'source_id' => $senior->id,
        ]);
        Bus::assertDispatchedAfterResponse(DeliverAdvisory::class, fn (DeliverAdvisory $job) => $job->channel === 'email'
            && $job->recipient === 'president@example.test'
            && $job->message === $message);
    }

    public function test_a_review_needs_a_note_and_a_pending_registration(): void
    {
        [$senior] = $this->pendingRegistration();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']));

        $this->postJson("/api/seniors/{$senior->osca_id_number}/review", ['note' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('note');

        $senior->update(['status' => 'active']);
        $this->postJson("/api/seniors/{$senior->osca_id_number}/review", ['note' => 'Wrong file.'])
            ->assertUnprocessable();
    }

    public function test_leaders_cannot_put_a_registration_in_review(): void
    {
        [$senior, $leader] = $this->pendingRegistration();
        Sanctum::actingAs($leader);

        $this->postJson("/api/seniors/{$senior->osca_id_number}/review", ['note' => 'Wrong file.'])
            ->assertForbidden();
    }

    public function test_new_documents_from_the_leader_end_the_review_and_notify_reviewers(): void
    {
        Storage::fake('local');
        [$senior, $leader] = $this->pendingRegistration();
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $senior->update(['review_note' => 'The valid ID is blurry.', 'review_flagged_by' => $admin->id, 'review_flagged_at' => now()]);
        Sanctum::actingAs($leader);

        $this->post("/api/seniors/{$senior->osca_id_number}/documents", [
            'valid_id' => UploadedFile::fake()->image('id.jpg'),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('review_note', null)
            ->assertJsonPath('status', 'pending');

        $this->assertNotNull($senior->fresh()->valid_id_path);
        $this->assertDatabaseHas('notifications', [
            'recipient_account_id' => $admin->id,
            'source_type' => 'document_review',
            'source_id' => $senior->id,
        ]);
    }

    public function test_documents_can_only_be_resubmitted_while_in_review_and_within_the_barangay(): void
    {
        [$senior, $leader] = $this->pendingRegistration();
        Sanctum::actingAs($leader);
        $this->post("/api/seniors/{$senior->osca_id_number}/documents", [
            'valid_id' => UploadedFile::fake()->image('id.jpg'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $senior->update(['review_note' => 'Wrong file.']);
        $otherLeader = User::factory()->create([
            'role' => 'president',
            'status' => 'active',
            'barangay_id' => Barangay::create(['barangay_name' => 'Zone 2'])->id,
        ]);
        Sanctum::actingAs($otherLeader);
        $this->post("/api/seniors/{$senior->osca_id_number}/documents", [
            'valid_id' => UploadedFile::fake()->image('id.jpg'),
        ], ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_leader_is_notified_and_emailed_when_a_registration_is_decided(): void
    {
        Bus::fake();
        DB::table('app_settings')->insert([
            'key' => 'notification_channels',
            'value' => json_encode(['email_advisories' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        [$senior, $leader] = $this->pendingRegistration();
        $leader->update(['email' => 'president@example.test']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']));

        $this->putJson("/api/seniors/{$senior->osca_id_number}", [
            'status' => 'inactive',
            'inactive_reason' => 'not_eligible',
        ])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'recipient_account_id' => $leader->id,
            'message' => 'The registration of Lola Reyes (OSCA-REV-001) was marked not eligible.',
            'source_type' => 'registration_review',
        ]);
        Bus::assertDispatchedAfterResponse(DeliverAdvisory::class, fn (DeliverAdvisory $job) => $job->recipient === 'president@example.test'
            && $job->subject === 'Lola Reyes is not eligible');

        // Later edits to a decided record do not notify again.
        $this->putJson("/api/seniors/{$senior->osca_id_number}", ['address' => 'Purok 2'])->assertOk();
        Bus::assertDispatchedAfterResponse(DeliverAdvisory::class, 1);
    }

    public function test_approving_a_registration_ends_its_review(): void
    {
        [$senior] = $this->pendingRegistration();
        $senior->update(['review_note' => 'Wrong file.']);

        $senior->update(['status' => 'active']);

        $this->assertNull($senior->fresh()->review_note);
    }

    public function test_eligibility_review_filters_registrations_by_review_status(): void
    {
        [$awaiting, $leader] = $this->pendingRegistration();
        $inReview = $awaiting->replicate()->fill(['osca_id_number' => 'OSCA-REV-002', 'review_note' => 'Wrong file.']);
        $inReview->save();
        $notEligible = $awaiting->replicate()->fill([
            'osca_id_number' => 'OSCA-REV-003',
            'status' => 'inactive',
            'inactive_reason' => 'not_eligible',
        ]);
        $notEligible->save();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin', 'status' => 'active']));

        $ids = fn (string $query) => collect($this->getJson("/api/seniors?{$query}")->assertOk()->json('data'))
            ->pluck('osca_id_number')->all();

        $this->assertSame(['OSCA-REV-001'], $ids('pending_only=1&review=awaiting'));
        $this->assertSame(['OSCA-REV-002'], $ids('pending_only=1&review=in_review'));
        $this->assertSame(['OSCA-REV-003'], $ids('review=not_eligible'));
    }

    /** @return array{SeniorCitizen, User} */
    private function pendingRegistration(): array
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
        /** @var User $leader */
        $leader = User::factory()->create([
            'role' => 'president',
            'status' => 'active',
            'barangay_id' => $barangay->id,
        ]);
        $senior = SeniorCitizen::create([
            'osca_id_number' => 'OSCA-REV-001',
            'barangay_id' => $barangay->id,
            'encoded_by' => $leader->id,
            'first_name' => 'Lola',
            'last_name' => 'Reyes',
            'birthdate' => now()->subYears(70)->toDateString(),
            'sex' => 'female',
            'registration_date' => now()->toDateString(),
            'status' => 'pending',
        ]);

        return [$senior, $leader];
    }
}
