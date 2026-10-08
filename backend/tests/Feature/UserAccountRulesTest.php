<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserAccountRulesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
    }

    public function test_admin_cannot_create_another_admin_account(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/users', $this->account(['role' => 'admin']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');

        $this->assertSame(1, User::where('role', 'admin')->count());
    }

    public function test_admin_can_create_a_head_account(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/users', $this->account(['role' => 'head']))
            ->assertCreated();
    }

    public function test_an_existing_account_cannot_be_promoted_to_admin(): void
    {
        /** @var User $head */
        $head = User::factory()->create(['role' => 'head', 'status' => 'active']);

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/users/{$head->id}", [
                'name' => $head->name,
                'email' => $head->email,
                'role' => 'admin',
                'status' => 'active',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');

        $this->assertSame('head', $head->fresh()->role);
    }

    public function test_an_existing_admin_keeps_the_admin_role_when_edited(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/users/{$this->admin->id}", [
                'name' => 'Renamed Admin',
                'email' => $this->admin->email,
                'role' => 'admin',
                'status' => 'active',
            ])
            ->assertOk();
    }

    public function test_mobile_number_must_be_eleven_digits_starting_with_09(): void
    {
        foreach (['0917123456', '091712345678', '+639171234567', '0817 123 4567', 'abc'] as $number) {
            $this->actingAs($this->admin, 'sanctum')
                ->postJson('/api/admin/users', $this->account(['contact_number' => $number]))
                ->assertStatus(422)
                ->assertJsonValidationErrors('contact_number');
        }

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/users', $this->account(['contact_number' => '09171234567']))
            ->assertCreated();
    }

    private function account(array $overrides = []): array
    {
        return [
            'first_name' => 'Renzo',
            'middle_name' => 'Lee',
            'last_name' => 'Jaza',
            'email' => 'renzo@example.com',
            'contact_number' => '09171234567',
            'birthdate' => '1990-01-01',
            'role' => 'head',
            'status' => 'active',
            'password' => 'Secret#123',
            'password_confirmation' => 'Secret#123',
            ...$overrides,
        ];
    }
}
