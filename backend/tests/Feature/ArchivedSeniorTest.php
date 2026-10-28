<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ArchivedSeniorTest extends TestCase
{
    use RefreshDatabase;

    public function test_archived_record_keeps_its_information_and_files_for_the_admin(): void
    {
        Storage::fake('local');
        $barangay = Barangay::create(['barangay_name' => 'Calpi']);
        $pension = Benefit::create(['benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60, 'amount' => 3000, 'funding_source' => 'national', 'schedule' => 'quarterly', 'status' => 'active']);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $leader = User::factory()->create(['role' => 'president', 'status' => 'active', 'barangay_id' => $barangay->id]);
        $certificate = UploadedFile::fake()->create('certificate.pdf', 100, 'application/pdf')->store('senior-documents', 'local');
        $senior = SeniorCitizen::create([
            'osca_id_number' => 'BSC-2026-9001', 'barangay_id' => $barangay->id, 'benefit_id' => $pension->id,
            'encoded_by' => $leader->id, 'first_name' => 'Lola', 'last_name' => 'Reyes', 'birthdate' => '1940-01-01',
            'sex' => 'female', 'registration_date' => '2026-01-01', 'status' => 'inactive',
            'inactive_reason' => 'deceased', 'date_of_death' => '2026-10-01', 'death_certificate_path' => $certificate,
        ]);

        $this->actingAs($admin, 'sanctum')->deleteJson('/api/seniors/BSC-2026-9001')->assertNoContent();
        $this->assertSoftDeleted($senior);

        $this->getJson('/api/seniors/archive')
            ->assertOk()
            ->assertJsonPath('data.0.osca_id_number', 'BSC-2026-9001')
            ->assertJsonPath('data.0.barangay.barangay_name', 'Calpi')
            ->assertJsonPath('data.0.benefit.benefit_name', 'Social Pension')
            ->assertJsonPath('data.0.inactive_reason', 'deceased')
            ->assertJsonPath('data.0.archived_by', $admin->name);
        $this->get('/api/seniors/BSC-2026-9001/files/death_certificate')->assertOk();

        $this->actingAs($leader, 'sanctum')
            ->getJson('/api/seniors/BSC-2026-9001/files/death_certificate')
            ->assertNotFound();
    }
}
