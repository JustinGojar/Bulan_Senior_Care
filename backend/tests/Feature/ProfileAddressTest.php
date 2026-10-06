<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileAddressTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_save_and_read_their_address_in_profile(): void
    {
        $user = User::factory()->create([
            'contact_number' => '0917-123-4567',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'contact_number' => '0917-123-4567',
                'address' => '123 Rizal Street, Poblacion, Bulan',
            ])
            ->assertOk()
            ->assertJsonPath('address', '123 Rizal Street, Poblacion, Bulan');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'address' => '123 Rizal Street, Poblacion, Bulan',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('address', '123 Rizal Street, Poblacion, Bulan');
    }
}
