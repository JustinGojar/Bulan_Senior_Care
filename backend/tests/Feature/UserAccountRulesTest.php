<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_profile_photo_is_optional_and_can_be_set_replaced_and_removed(): void
    {
        Storage::fake('public');

        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/users', $this->account(['email' => 'nophoto@example.com']))
            ->assertCreated()
            ->assertJsonPath('user.profile_photo_path', null);

        $first = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/admin/users', $this->account([
                'profile_photo' => UploadedFile::fake()->image('first.jpg'),
            ]), ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('user.profile_photo_path');
        Storage::disk('public')->assertExists($first);

        /** @var User $user */
        $user = User::where('profile_photo_path', $first)->firstOrFail();
        $edit = [
            '_method' => 'PUT',
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => 'active',
        ];

        $second = $this->actingAs($this->admin, 'sanctum')
            ->post("/api/admin/users/{$user->id}", $edit + [
                'profile_photo' => UploadedFile::fake()->image('second.png'),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('profile_photo_path');
        Storage::disk('public')->assertExists($second);
        Storage::disk('public')->assertMissing($first);

        $this->actingAs($this->admin, 'sanctum')
            ->post("/api/admin/users/{$user->id}", $edit + ['remove_profile_photo' => '1'], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('profile_photo_path', null);
        Storage::disk('public')->assertMissing($second);
    }

    /** BSCA-001: one president account per barangay via the admin user route. */
    public function test_cannot_create_a_second_president_for_the_same_barangay(): void
    {
        $barangay = \App\Models\Barangay::create(['barangay_name' => 'Zone 1', 'municipality' => 'Bulan', 'province' => 'Sorsogon']);
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/users', $this->account(['role' => 'president', 'barangay_id' => $barangay->id, 'email' => 'zone1@example.com']))
            ->assertCreated();

        // A second president with a different email for the same barangay is blocked.
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/users', $this->account(['role' => 'president', 'barangay_id' => $barangay->id, 'email' => 'other@example.com']))
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $message) => str_starts_with($message, 'A Barangay President'));
        $this->assertSame(1, \App\Models\User::where('barangay_id', $barangay->id)->where('role', 'president')->count());
        // The first president still exists; email is still globally unique too.
        $this->assertDatabaseHas('users', [
            'email' => 'zone1@example.com',
            'barangay_id' => $barangay->id,
            'role' => 'president',
        ]);
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

    /** BSCA-002: the barangay-president creation route also gates on the same rule. */
    public function test_creating_a_second_president_for_the_same_barangay_via_route_is_blocked(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 4', 'municipality' => 'Bulan', 'province' => 'Sorsogon']);
        $barangayId = $barangay->id;
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/barangay-presidents', [
                'first_name' => 'Jeanette',
                'last_name' => 'Santos',
                'email' => 'jeanette@example.com',
                'contact_number' => '09187654321',
                'birthdate' => '1960-01-01',
                'barangay_id' => $barangayId,
                'password' => 'Secret#123',
                'password_confirmation' => 'Secret#123',
            ])->assertCreated();

        // A second president for the SAME barangay is blocked with a friendly message.
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/barangay-presidents', [
                'first_name' => 'Maria',
                'last_name' => 'Cruz',
                'email' => 'maria@example.com',
                'contact_number' => '09198765432',
                'birthdate' => '1955-05-05',
                'barangay_id' => $barangayId,
                'password' => 'Secret#123',
                'password_confirmation' => 'Secret#123',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $message) => str_starts_with($message, 'A Barangay President'));
        $this->assertSame(1, \App\Models\User::where('barangay_id', $barangayId)->where('role', 'president')->count());
    }
}