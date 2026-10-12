<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SeniorDeceasedTest extends TestCase
{
    use RefreshDatabase;

    private function setUpSenior(): array
    {
        $barangay = Barangay::create(['barangay_name' => 'Calpi']);
        $other = Barangay::create(['barangay_name' => 'Gate']);
        /** @var User $leader */
        $leader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $barangay->id]);
        /** @var User $outsider */
        $outsider = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $other->id]);
        $pension = Benefit::create(['benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60, 'amount' => 3000, 'funding_source' => 'national', 'schedule' => 'quarterly', 'status' => 'active']);
        $senior = SeniorCitizen::create([
            'osca_id_number' => 'BSC-2026-9001', 'barangay_id' => $barangay->id, 'benefit_id' => $pension->id,
            'encoded_by' => $leader->id, 'first_name' => 'Lola', 'last_name' => 'Reyes', 'birthdate' => '1940-01-01',
            'sex' => 'female', 'registration_date' => '2026-01-01', 'status' => 'active',
        ]);
        $pending = BenefitTransaction::create([
            'senior_citizen_id' => $senior->id, 'benefit_id' => $pension->id, 'distributed_by' => $leader->id,
            'amount' => 3000, 'period_label' => 'Q4 2026', 'status' => 'pending',
        ]);

        return [$leader, $outsider, $senior, $pending];
    }

    public function test_leader_records_a_death_with_its_certificate(): void
    {
        Storage::fake('local');
        [$leader, , $senior, $pending] = $this->setUpSenior();

        $this->actingAs($leader, 'sanctum')
            ->post("/api/seniors/{$senior->osca_id_number}/deceased", [
                'date_of_death' => '2026-10-01',
                'death_certificate' => UploadedFile::fake()->create('certificate.pdf', 100, 'application/pdf'),
                'remarks' => 'Reported by daughter.',
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('status', 'inactive')
            ->assertJsonPath('inactive_reason', 'deceased')
            ->assertJsonPath('inactivator.name', $leader->name);

        $senior->refresh();
        $this->assertSame('2026-10-01', $senior->date_of_death->toDateString());
        Storage::disk('local')->assertExists($senior->death_certificate_path);
        $this->assertSame('failed', $pending->fresh()->status);

        $this->actingAs($leader, 'sanctum')
            ->get("/api/seniors/{$senior->osca_id_number}/files/death_certificate")
            ->assertOk();
    }

    public function test_a_death_needs_a_certificate_and_the_leaders_own_barangay(): void
    {
        [$leader, $outsider, $senior] = $this->setUpSenior();

        $this->actingAs($leader, 'sanctum')
            ->postJson("/api/seniors/{$senior->osca_id_number}/deceased", ['date_of_death' => '2026-10-01'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('death_certificate');

        $this->actingAs($outsider, 'sanctum')
            ->post("/api/seniors/{$senior->osca_id_number}/deceased", [
                'date_of_death' => '2026-10-01',
                'death_certificate' => UploadedFile::fake()->create('certificate.pdf', 100, 'application/pdf'),
            ], ['Accept' => 'application/json'])
            ->assertForbidden();

        $this->assertSame('active', $senior->fresh()->status);
    }

    public function test_editing_status_to_inactive_needs_a_reason_and_death_documents(): void
    {
        Storage::fake('local');
        [, , $senior, $pending] = $this->setUpSenior();
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $url = "/api/seniors/{$senior->osca_id_number}";
        $headers = ['Accept' => 'application/json'];

        $this->actingAs($admin, 'sanctum')
            ->post($url, ['_method' => 'PUT', 'status' => 'inactive'], $headers)
            ->assertStatus(422)
            ->assertJsonValidationErrors('inactive_reason');

        $this->actingAs($admin, 'sanctum')
            ->post($url, ['_method' => 'PUT', 'status' => 'inactive', 'inactive_reason' => 'deceased', 'date_of_death' => '2026-10-01'], $headers)
            ->assertStatus(422);

        $this->actingAs($admin, 'sanctum')
            ->post($url, ['_method' => 'PUT', 'status' => 'inactive', 'inactive_reason' => 'transferred', 'inactive_remarks' => 'Moved to Irosin'], $headers)
            ->assertOk()
            ->assertJsonPath('inactive_reason', 'transferred')
            ->assertJsonPath('inactive_remarks', 'Moved to Irosin');
        $this->assertSame('pending', $pending->fresh()->status);

        $this->actingAs($admin, 'sanctum')
            ->post($url, [
                '_method' => 'PUT',
                'status' => 'inactive',
                'inactive_reason' => 'deceased',
                'date_of_death' => '2026-10-01',
                'death_certificate' => UploadedFile::fake()->create('certificate.pdf', 100, 'application/pdf'),
            ], $headers)
            ->assertOk()
            ->assertJsonPath('inactive_reason', 'deceased');
        $this->assertSame('failed', $pending->fresh()->status);

        // Reactivating clears the reason and its documents.
        $this->actingAs($admin, 'sanctum')
            ->post($url, ['_method' => 'PUT', 'status' => 'active'], $headers)
            ->assertOk()
            ->assertJsonPath('inactive_reason', null)
            ->assertJsonPath('date_of_death', null);
    }
}
