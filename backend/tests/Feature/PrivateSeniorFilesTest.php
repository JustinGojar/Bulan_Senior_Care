<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PrivateSeniorFilesTest extends TestCase
{
    use RefreshDatabase;

    private Barangay $zoneOne;

    private Barangay $zoneTwo;

    private User $admin;

    private FilesystemAdapter $privateDisk;

    private FilesystemAdapter $publicDisk;

    protected function setUp(): void
    {
        parent::setUp();
        $this->privateDisk = Storage::fake('local');
        $this->publicDisk = Storage::fake('public');

        $this->zoneOne = Barangay::create(['barangay_name' => 'Zone 1']);
        $this->zoneTwo = Barangay::create(['barangay_name' => 'Zone 2']);
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'status' => 'active',
        ]);
    }

    public function test_registration_documents_are_stored_on_the_private_disk(): void
    {
        $leader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->zoneOne->id]);
        $this->actingAs($leader, 'sanctum')->post('/api/seniors', [
            'privacy_consent' => true,
            'privacy_consent_version' => '2026-10-07',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'birthdate' => '1960-01-01',
            'sex' => 'male',
            'contact_number' => '09123456789',
            'barangay' => 'Zone 1',
            'benefit' => 'Social Pension',
            'valid_id' => UploadedFile::fake()->create('id.pdf', 20, 'application/pdf'),
            'birth_certificate' => UploadedFile::fake()->create('birth.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $senior = SeniorCitizen::firstOrFail();
        foreach (['valid_id_path', 'birth_certificate_path'] as $column) {
            $this->privateDisk->assertExists($senior->{$column});
            $this->publicDisk->assertMissing($senior->{$column});
        }
    }

    public function test_signed_in_staff_can_download_a_senior_document(): void
    {
        $senior = $this->seniorWithDocument($this->zoneOne);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->get("/api/seniors/{$senior->osca_id_number}/files/valid_id");

        $response->assertOk();
        $this->assertSame('id-scan', $response->streamedContent());
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_guests_cannot_download_a_senior_document(): void
    {
        $senior = $this->seniorWithDocument($this->zoneOne);

        $this->getJson("/api/seniors/{$senior->osca_id_number}/files/valid_id")->assertUnauthorized();
    }

    public function test_leaders_cannot_download_documents_from_another_barangay(): void
    {
        $senior = $this->seniorWithDocument($this->zoneTwo);
        /** @var User $leader */
        $leader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->zoneOne->id]);

        $this->actingAs($leader, 'sanctum')
            ->getJson("/api/seniors/{$senior->osca_id_number}/files/valid_id")
            ->assertForbidden();
    }

    public function test_unknown_file_kinds_and_missing_files_are_not_found(): void
    {
        $senior = $this->seniorWithDocument($this->zoneOne);

        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/seniors/{$senior->osca_id_number}/files/password")
            ->assertNotFound();
        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/seniors/{$senior->osca_id_number}/files/birth_certificate")
            ->assertNotFound();
    }

    public function test_benefit_proof_downloads_are_scoped_to_the_leaders_barangay(): void
    {
        $senior = $this->seniorWithDocument($this->zoneTwo);
        $this->privateDisk->put('benefit-proofs/proof.pdf', 'proof');
        $transaction = BenefitTransaction::create([
            'senior_citizen_id' => $senior->id,
            'benefit_id' => Benefit::firstOrFail()->id,
            'distributed_by' => $this->admin->id,
            'amount' => 3000,
            'period_label' => '2026-Q1',
            'status' => 'released',
            'attachment_path' => 'benefit-proofs/proof.pdf',
        ]);
        /** @var User $leader */
        $leader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->zoneOne->id]);

        $this->actingAs($leader, 'sanctum')
            ->getJson("/api/benefit-transactions/{$transaction->id}/attachment")
            ->assertForbidden();
        $this->assertSame('proof', $this->actingAs($this->admin, 'sanctum')
            ->get("/api/benefit-transactions/{$transaction->id}/attachment")
            ->assertOk()
            ->streamedContent());
    }

    public function test_migration_moves_existing_public_files_to_the_private_disk(): void
    {
        $senior = $this->seniorWithDocument($this->zoneOne);
        $this->privateDisk->delete('senior-documents/id.pdf');
        $this->publicDisk->put('senior-documents/id.pdf', 'id-scan');

        $migration = require database_path('migrations/2026_10_08_120000_move_senior_files_to_private_disk.php');
        $migration->up();

        $this->publicDisk->assertMissing('senior-documents/id.pdf');
        $this->assertSame('id-scan', $this->privateDisk->get($senior->valid_id_path));
    }

    private function seniorWithDocument(Barangay $barangay): SeniorCitizen
    {
        $this->privateDisk->put('senior-documents/id.pdf', 'id-scan');

        return SeniorCitizen::create([
            'osca_id_number' => 'BSC-TEST-'.$barangay->id,
            'barangay_id' => $barangay->id,
            'encoded_by' => $this->admin->id,
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'birthdate' => now()->subYears(70)->toDateString(),
            'sex' => 'female',
            'registration_date' => now()->toDateString(),
            'status' => 'pending',
            'valid_id_path' => 'senior-documents/id.pdf',
        ]);
    }
}
