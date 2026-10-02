<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeniorBulkUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_leader_can_create_pending_senior_without_document_files(): void
    {
        $barangay = Barangay::create([
            'barangay_name' => 'Bulusan',
            'municipality' => 'Bulan',
            'province' => 'Sorsogon',
        ]);

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'leader',
            'barangay_id' => $barangay->id,
        ]);

        Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'max_age' => null,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'description' => 'Social pension',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/seniors', [
            'first_name' => 'Juan',
            'middle_name' => 'A.',
            'last_name' => 'Dela Cruz',
            'birthdate' => '1960-01-01',
            'sex' => 'male',
            'contact_number' => '09123456789',
            'barangay' => 'Bulusan',
            'benefit' => 'Social Pension',
            'status' => 'pending',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('senior_citizens', [
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $user->id,
            'action' => 'created',
            'target_type' => SeniorCitizen::class,
        ]);
    }

    public function test_bulk_import_creates_a_missing_barangay(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['role' => 'admin']);

        Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'max_age' => null,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'description' => 'Social pension',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/seniors/bulk', [
            'records' => [[
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'birthdate' => '1960-01-01',
                'place_of_birth' => 'Bulan, Sorsogon',
                'sex' => 'female',
                'contact_number' => '09123456789',
                'barangay' => 'Zone 8 (Loyo)',
                'civil_status' => 'Married',
                'educational_attainment' => 'College graduate',
                'other_skills' => 'Singer',
                'family_composition' => 'Ana Garbin | Daughter | 38',
                'association_name' => 'Senior Citizens Association of Zone 8',
                'association_address' => 'Zone 8, Bulan, Sorsogon',
                'association_membership_date' => '2019-06-10',
                'association_position' => 'Member',
                'benefit' => 'Social Pension',
            ]],
        ]);

        $response->assertCreated()->assertJsonCount(1, 'created');
        $this->assertDatabaseHas('barangays', ['barangay_name' => 'Zone 8 (Loyo)']);
        $this->assertDatabaseHas('senior_citizens', ['first_name' => 'Maria', 'last_name' => 'Santos']);
        $this->assertDatabaseHas('senior_citizens', [
            'first_name' => 'Maria',
            'place_of_birth' => 'Bulan, Sorsogon',
            'association_name' => 'Senior Citizens Association of Zone 8',
            'association_position' => 'Member',
        ]);
    }

    public function test_bulk_import_returns_row_error_for_underage_record(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['role' => 'admin']);
        $cutoffDate = now()->subYears(60)->toDateString();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/seniors/bulk', [
            'records' => [[
                'first_name' => 'Antonio Miguel',
                'last_name' => 'Reyes',
                'birthdate' => '1967-03-24',
                'sex' => 'male',
                'contact_number' => '09000000000',
                'barangay' => 'Zone 8',
                'benefit' => 'Social Pension',
            ]],
        ]);

        $response->assertOk()->assertJsonPath('failed.0.row', 2);
        $response->assertJsonPath('failed.0.message', "The birthdate field must be a date before or equal to {$cutoffDate}.");
    }

    public function test_admin_can_create_non_leader_accounts_without_barangay_assignment(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users', [
            'first_name' => 'Mina',
            'middle_name' => 'A.',
            'last_name' => 'Talag',
            'email' => 'head.ops@example.com',
            'contact_number' => '09112223344',
            'birthdate' => '1984-06-04',
            'role' => 'head',
            'status' => 'inactive',
            'password' => 'Password!23',
            'password_confirmation' => 'Password!23',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => 'head.ops@example.com',
            'role' => 'head',
            'barangay_id' => null,
            'status' => 'inactive',
        ]);
    }
}
