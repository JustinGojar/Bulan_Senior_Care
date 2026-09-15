<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
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
    }
}
