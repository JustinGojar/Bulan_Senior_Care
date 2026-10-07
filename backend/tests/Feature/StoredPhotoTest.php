<?php

namespace Tests\Feature;

use App\Models\Benefit;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StoredPhotoTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_photo_is_restored_after_storage_is_wiped(): void
    {
        Storage::fake('public');
        /** @var User $user */
        $user = User::factory()->create(['status' => 'active']);

        $path = $this->actingAs($user, 'sanctum')
            ->post('/api/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'profile_photo' => UploadedFile::fake()->image('me.jpg', 64, 64),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('profile_photo_path');

        $original = Storage::disk('public')->get($path);
        // What a redeploy does to the uploaded files.
        Storage::disk('public')->delete($path);

        $response = $this->get('/storage/'.$path)->assertOk();
        $this->assertSame($original, $response->getContent());
        $this->assertStringStartsWith('image/', $response->headers->get('Content-Type'));
        Storage::disk('public')->assertExists($path);
    }

    public function test_replacing_the_photo_removes_the_old_one(): void
    {
        Storage::fake('public');
        /** @var User $user */
        $user = User::factory()->create(['status' => 'active']);

        $upload = fn () => $this->actingAs($user, 'sanctum')
            ->post('/api/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'profile_photo' => UploadedFile::fake()->image('me.jpg'),
            ], ['Accept' => 'application/json'])
            ->json('profile_photo_path');

        $old = $upload();
        $new = $upload();

        $this->assertNotSame($old, $new);
        Storage::disk('public')->assertMissing($old);
        $this->assertDatabaseMissing('stored_photos', ['path' => $old]);
        $this->get('/storage/'.$old)->assertNotFound();
    }

    public function test_senior_photo_is_restored_and_replaced(): void
    {
        Storage::fake('public');
        $admin = $this->registerSenior(['profile_photo' => UploadedFile::fake()->image('juan.jpg')]);

        $senior = SeniorCitizen::firstOrFail();
        $old = $senior->photo_path;
        $original = Storage::disk('public')->get($old);
        Storage::disk('public')->delete($old);

        $this->assertSame($original, $this->get('/storage/'.$old)->assertOk()->getContent());
        Storage::disk('public')->assertExists($old);

        $this->actingAs($admin, 'sanctum')->post('/api/seniors/'.$senior->osca_id_number, [
            '_method' => 'PUT',
            'profile_photo' => UploadedFile::fake()->image('juan-new.jpg'),
        ], ['Accept' => 'application/json'])->assertOk();

        $new = $senior->fresh()->photo_path;
        $this->assertNotSame($old, $new);
        Storage::disk('public')->assertMissing($old);
        $this->assertDatabaseMissing('stored_photos', ['path' => $old]);
        $this->assertDatabaseHas('stored_photos', ['path' => $new]);
    }

    public function test_only_backed_up_folders_are_served_from_the_database(): void
    {
        DB::table('stored_photos')->insert([
            'path' => 'benefit-proofs/proof.jpg',
            'mime_type' => 'image/jpeg',
            'contents' => base64_encode('secret'),
        ]);

        $this->get('/storage/benefit-proofs/proof.jpg')->assertDontSee('secret');
        $this->get('/storage/profile-photos/missing.jpg')->assertNotFound();
    }

    public function test_id_document_is_restored_and_replaced(): void
    {
        Storage::fake('public');
        $admin = $this->registerSenior([
            'valid_id' => UploadedFile::fake()->create('id.pdf', 100, 'application/pdf'),
        ]);

        $senior = SeniorCitizen::firstOrFail();
        $old = $senior->valid_id_path;
        $this->assertStringEndsWith('.pdf', $old);
        $original = Storage::disk('public')->get($old);
        Storage::disk('public')->delete($old);

        $response = $this->get('/storage/'.$old)->assertOk();
        $this->assertSame($original, $response->getContent());
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        Storage::disk('public')->assertExists($old);

        $this->actingAs($admin, 'sanctum')->post('/api/seniors/'.$senior->osca_id_number, [
            '_method' => 'PUT',
            'valid_id' => UploadedFile::fake()->image('id-new.jpg'),
        ], ['Accept' => 'application/json'])->assertOk();

        $new = $senior->fresh()->valid_id_path;
        $this->assertNotSame($old, $new);
        Storage::disk('public')->assertMissing($old);
        $this->assertDatabaseMissing('stored_photos', ['path' => $old]);
        $this->assertDatabaseHas('stored_photos', ['path' => $new]);
    }

    /** Registers a senior as a new admin, with the given uploads, and returns the admin. */
    private function registerSenior(array $files): User
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')->post('/api/seniors', [
            'privacy_consent' => true,
            'privacy_consent_version' => '2026-10-07',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'birthdate' => '1960-01-01',
            'sex' => 'male',
            'contact_number' => '09123456789',
            'barangay' => 'Bulusan',
            'benefit' => 'Social Pension',
            'status' => 'pending',
            ...$files,
        ], ['Accept' => 'application/json'])->assertCreated();

        return $admin;
    }
}
