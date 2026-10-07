<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfilePhotoTest extends TestCase
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
        $this->assertDatabaseMissing('profile_photos', ['path' => $old]);
        $this->get('/storage/'.$old)->assertNotFound();
    }
}
