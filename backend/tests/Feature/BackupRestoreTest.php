<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BackupRestoreTest extends TestCase
{
    use RefreshDatabase;

    private function backupOf(User $admin): string
    {
        return $this->actingAs($admin, 'sanctum')->post('/api/admin/backups')->assertOk()->streamedContent();
    }

    private function restore(User $admin, string $contents, string $confirmation = 'RESTORE')
    {
        return $this->actingAs($admin, 'sanctum')->post('/api/admin/backups/restore', [
            'backup' => UploadedFile::fake()->createWithContent('backup.json', $contents),
            'confirmation' => $confirmation,
        ], ['Accept' => 'application/json']);
    }

    public function test_admin_can_restore_a_backup_after_the_data_changed(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $barangay = Barangay::query()->create(['barangay_name' => 'Zone 1']);
        /** @var User $president */
        $president = User::factory()->create(['role' => 'president', 'barangay_id' => $barangay->id]);
        $backup = $this->backupOf($admin);

        // The data is lost or changed after the backup was made.
        $president->forceDelete();
        $barangay->delete();
        User::factory()->create(['email' => 'created-later@example.com']);
        $admin->createToken('portal');

        $this->restore($admin, $backup)
            ->assertOk()
            ->assertJsonPath('tables.users', 2)
            ->assertCookieExpired('bulan_api_token');

        $this->assertDatabaseHas('users', ['id' => $president->id, 'email' => $president->email, 'barangay_id' => $barangay->id]);
        $this->assertDatabaseHas('barangays', ['id' => $barangay->id, 'barangay_name' => 'Zone 1']);
        $this->assertDatabaseMissing('users', ['email' => 'created-later@example.com']);
        $this->assertSame(0, DB::table('personal_access_tokens')->count());
        // Restored passwords still work.
        $this->assertTrue(password_verify('password', User::query()->findOrFail($president->id)->password));
        $this->assertTrue(AuditLog::query()->where('action', 'backup_restored')->where('actor_id', $admin->id)->exists());
    }

    public function test_a_seeded_system_restores_every_table_exactly(): void
    {
        $this->seed();
        /** @var User $admin */
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $backup = $this->backupOf($admin);
        $tables = array_keys(json_decode($backup, true)['tables']);
        $before = collect($tables)->mapWithKeys(fn ($table) => [$table => DB::table($table)->get()->map(fn ($row) => (array) $row)->all()]);

        $this->restore($admin, $backup)->assertOk();

        foreach ($before as $table => $rows) {
            if ($table === 'audit_logs') {
                // The restore itself adds one entry.
                $this->assertSame(count($rows) + 1, DB::table($table)->count());

                continue;
            }
            $restored = DB::table($table)->get()->map(fn ($row) => (array) $row)->all();
            if ($table === 'users') {
                $rows = array_map(fn ($row) => array_merge($row, ['remember_token' => null]), $rows);
            }
            $this->assertEqualsCanonicalizing($rows, $restored, "Table {$table} was not restored exactly.");
        }
    }

    public function test_only_admin_can_restore_a_backup(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        /** @var User $president */
        $president = User::factory()->create(['role' => 'president']);
        $backup = $this->backupOf($admin);

        $this->restore($president, $backup)->assertForbidden();
    }

    public function test_restore_must_be_confirmed(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $backup = $this->backupOf($admin);
        User::factory()->create(['email' => 'kept@example.com']);

        $this->restore($admin, $backup, 'yes')->assertUnprocessable()->assertJsonValidationErrors('confirmation');
        $this->assertDatabaseHas('users', ['email' => 'kept@example.com']);
    }

    public function test_a_file_that_is_not_a_backup_is_rejected(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);

        $this->restore($admin, '{"hello":"world"}')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This file is not a Bulan SeniorCare backup.');
        $this->restore($admin, 'not json at all')->assertUnprocessable();
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_an_incomplete_backup_changes_nothing(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $backup = $this->backupOf($admin);
        User::factory()->create(['email' => 'kept@example.com']);

        $this->restore($admin, substr($backup, 0, -4))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The backup file is incomplete. It may not have finished downloading.');
        $this->assertDatabaseHas('users', ['email' => 'kept@example.com']);
    }

    public function test_a_backup_without_an_active_admin_is_rejected(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $backup = $this->backupOf($admin);
        $withoutAdmin = str_replace('"role":"admin"', '"role":"president"', $backup);

        $this->restore($admin, $withoutAdmin)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The backup has no active Admin account, so nobody could sign in after restoring it.');
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'role' => 'admin']);
    }

    public function test_a_backup_from_before_the_line_per_row_layout_restores(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $legacy = json_encode(json_decode($this->backupOf($admin), true));
        User::factory()->create(['email' => 'created-later@example.com']);

        $this->restore($admin, $legacy)->assertOk();
        $this->assertDatabaseMissing('users', ['email' => 'created-later@example.com']);
    }

    public function test_backup_can_be_restored_from_the_command_line(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $path = tempnam(sys_get_temp_dir(), 'backup');
        file_put_contents($path, $this->backupOf($admin));
        User::factory()->create(['email' => 'created-later@example.com']);

        $this->artisan('backup:restore', ['file' => $path, '--force' => true])
            ->expectsOutputToContain('The backup was restored.')
            ->assertSuccessful();
        $this->assertDatabaseMissing('users', ['email' => 'created-later@example.com']);
        unlink($path);
    }
}
