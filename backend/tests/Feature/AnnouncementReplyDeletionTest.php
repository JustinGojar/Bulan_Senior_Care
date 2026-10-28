<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementReplyDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_replies_can_be_deleted_by_their_author_or_head_and_listing_exposes_owner(): void
    {
        /** @var User $head */
        $head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        /** @var User $president */
        $president = User::factory()->create(['role' => 'president', 'status' => 'active']);
        /** @var User $other */
        $other = User::factory()->create(['role' => 'president', 'status' => 'active']);
        $announcement = Announcement::create(['created_by' => $head->id, 'title' => 'T', 'message' => 'M', 'published_at' => now()]);
        $url = "/api/announcements/{$announcement->id}/comments";

        $commentId = $this->actingAs($president, 'sanctum')->postJson($url, ['message' => 'Comment'])->assertCreated()->json('id');
        $replyId = $this->actingAs($other, 'sanctum')->postJson($url, ['message' => 'Reply', 'parent_comment_id' => $commentId])->assertCreated()->json('id');
        $secondReplyId = $this->actingAs($president, 'sanctum')->postJson($url, ['message' => 'Reply 2', 'parent_comment_id' => $commentId])->assertCreated()->json('id');

        // The dashboard decides who sees the delete button from user_id.
        $listed = collect($this->getJson('/api/announcements')->json())->firstWhere('id', $announcement->id);
        $this->assertSame($president->id, $listed['comments'][0]['user_id']);
        $this->assertSame($other->id, $listed['comments'][0]['replies'][0]['user_id']);

        $this->actingAs($president, 'sanctum')->deleteJson("{$url}/{$replyId}")->assertForbidden();
        $this->actingAs($other, 'sanctum')->deleteJson("{$url}/{$replyId}")->assertNoContent();
        $this->actingAs($head, 'sanctum')->deleteJson("{$url}/{$secondReplyId}")->assertNoContent();
        $this->assertDatabaseMissing('announcement_comments', ['id' => $replyId]);
        $this->assertDatabaseMissing('announcement_comments', ['id' => $secondReplyId]);
        $this->assertDatabaseHas('announcement_comments', ['id' => $commentId]);
    }
}
