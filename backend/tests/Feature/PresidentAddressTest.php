<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PresidentAddressTest extends TestCase
{
    use RefreshDatabase;

    public function test_president_address_comes_from_the_assigned_barangay_and_cannot_be_edited(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 1 (Pob.)']);
        /** @var User $president */
        $president = User::factory()->create([
            'role' => 'president', 'status' => 'active', 'barangay_id' => $barangay->id, 'address' => 'Somewhere else',
        ]);
        $this->assertSame('Zone 1 (Pob.), Bulan, Sorsogon', $president->address);

        $this->actingAs($president, 'sanctum')
            ->post('/api/profile', [
                'name' => $president->name,
                'email' => $president->email,
                'address' => 'Typed by the president',
            ])
            ->assertOk()
            ->assertJsonPath('address', 'Zone 1 (Pob.), Bulan, Sorsogon');
    }

    public function test_reassigning_the_barangay_updates_the_address(): void
    {
        $first = Barangay::create(['barangay_name' => 'Aquino']);
        $second = Barangay::create(['barangay_name' => 'Calomagon']);
        $president = User::factory()->create(['role' => 'president', 'barangay_id' => $first->id]);

        $president->update(['barangay_id' => $second->id]);

        $this->assertSame('Calomagon, Bulan, Sorsogon', $president->fresh()->address);
    }

    public function test_other_roles_keep_the_address_they_enter(): void
    {
        $head = User::factory()->create(['role' => 'head', 'address' => 'OSCA Office, Bulan']);

        $this->assertSame('OSCA Office, Bulan', $head->fresh()->address);
    }
}
