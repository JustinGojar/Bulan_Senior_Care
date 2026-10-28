<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackupAndDataPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_download_a_database_backup(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->createToken('portal');

        $response = $this->actingAs($admin, 'sanctum')->post('/api/admin/backups');

        $response->assertOk();
        $this->assertStringContainsString('attachment; filename=bulan-seniorcare-backup-', $response->headers->get('Content-Disposition'));
        $backup = json_decode($response->streamedContent(), true);
        $this->assertIsArray($backup);
        $this->assertSame($admin->email, collect($backup['tables']['users'])->firstWhere('id', $admin->id)['email']);
        $this->assertArrayNotHasKey('remember_token', $backup['tables']['users'][0]);
        $this->assertArrayNotHasKey('personal_access_tokens', $backup['tables']);
        $this->assertArrayNotHasKey('sessions', $backup['tables']);
        $this->assertTrue(AuditLog::query()->where('action', 'backup_created')->where('actor_id', $admin->id)->exists());
    }

    public function test_only_admin_can_create_a_backup(): void
    {
        /** @var User $leader */
        $leader = User::factory()->create(['role' => 'president']);

        $this->actingAs($leader, 'sanctum')->postJson('/api/admin/backups')->assertForbidden();
    }

    public function test_user_list_never_exposes_passwords_or_tokens(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'president', 'remember_token' => 'secret-remember-token']);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users')->assertOk();

        foreach ($response->json() as $user) {
            $this->assertEqualsCanonicalizing(
                ['id', 'name', 'first_name', 'middle_name', 'last_name', 'email', 'role', 'status', 'barangay_id', 'contact_number', 'birthdate', 'profile_photo_path', 'email_verified_at'],
                array_keys($user),
            );
        }
        $this->assertStringNotContainsString('secret-remember-token', $response->getContent());
        $this->assertStringNotContainsString('password', $response->getContent());
    }
}
