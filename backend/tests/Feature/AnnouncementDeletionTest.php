<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\AnnouncementComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AnnouncementDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_comment_can_be_an_image_and_only_its_author_or_head_can_delete_it(): void
    {
        Storage::fake('public');
        /** @var User $head */
        $head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        /** @var User $author */
        $author = User::factory()->create(['role' => 'leader', 'status' => 'active']);
        /** @var User $other */
        $other = User::factory()->create(['role' => 'leader', 'status' => 'active']);
        $announcement = Announcement::create(['created_by' => $head->id, 'title' => 'T', 'message' => 'M', 'published_at' => now()]);

        $commentId = $this->actingAs($author, 'sanctum')
            ->post("/api/announcements/{$announcement->id}/comments", ['image' => UploadedFile::fake()->image('photo.jpg')], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('id');
        $imagePath = AnnouncementComment::find($commentId)->image_path;
        Storage::disk('public')->assertExists($imagePath);

        $this->actingAs($other, 'sanctum')->deleteJson("/api/announcements/{$announcement->id}/comments/{$commentId}")->assertForbidden();
        $this->actingAs($author, 'sanctum')->deleteJson("/api/announcements/{$announcement->id}/comments/{$commentId}")->assertNoContent();

        $this->assertDatabaseMissing('announcement_comments', ['id' => $commentId]);
        Storage::disk('public')->assertMissing($imagePath);
    }

    public function test_only_head_can_delete_an_announcement(): void
    {
        /** @var User $head */
        $head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        /** @var User $leader */
        $leader = User::factory()->create(['role' => 'leader', 'status' => 'active']);
        $announcement = Announcement::create(['created_by' => $head->id, 'title' => 'T', 'message' => 'M', 'published_at' => now()]);
        AnnouncementComment::create(['announcement_id' => $announcement->id, 'user_id' => $leader->id, 'message' => 'Hi']);

        $this->actingAs($leader, 'sanctum')->deleteJson("/api/announcements/{$announcement->id}")->assertForbidden();
        $this->actingAs($head, 'sanctum')->deleteJson("/api/announcements/{$announcement->id}")->assertNoContent();

        $this->assertSoftDeleted('announcements', ['id' => $announcement->id]);
        $this->assertDatabaseCount('announcement_comments', 0);
    }
}
