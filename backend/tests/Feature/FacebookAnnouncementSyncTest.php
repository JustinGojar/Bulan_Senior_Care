<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FacebookAnnouncementSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_recent_page_posts_are_imported_once_as_announcements(): void
    {
        User::factory()->create(['role' => 'head', 'status' => 'active']);
        config([
            'services.facebook.page_id' => '61588479000878',
            'services.facebook.page_access_token' => 'test-page-token',
            'services.facebook.graph_version' => 'v23.0',
        ]);

        Http::fake([
            'graph.facebook.com/v23.0/61588479000878/posts*' => Http::response([
                'data' => [[
                    'id' => '61588479000878_12345',
                    'message' => "Office schedule\nThe office will be closed Friday.",
                    'permalink_url' => 'https://www.facebook.com/example/posts/12345',
                    'full_picture' => 'https://example.com/post-image.jpg',
                    'created_time' => '2026-10-01T08:00:00+0000',
                ]],
            ]),
        ]);

        $this->artisan('announcements:sync-facebook')->assertSuccessful();
        $this->artisan('announcements:sync-facebook')->assertSuccessful();

        $this->assertSame(1, Announcement::query()->where('facebook_post_id', '61588479000878_12345')->count());
        $this->assertDatabaseHas('announcements', [
            'facebook_post_id' => '61588479000878_12345',
            'title' => 'Office schedule',
            'message' => "Office schedule\nThe office will be closed Friday.",
            'source_url' => 'https://www.facebook.com/example/posts/12345',
            'source_image_url' => 'https://example.com/post-image.jpg',
        ]);
    }
}