<?php

namespace App\Console\Commands;

use App\Models\Announcement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SyncFacebookAnnouncements extends Command
{
    protected $signature = 'announcements:sync-facebook';

    protected $description = 'Import recent OSCA Bulan Facebook Page posts as system announcements';

    public function handle(): int
    {
        $pageId = config('services.facebook.page_id');
        $accessToken = config('services.facebook.page_access_token');
        $graphVersion = config('services.facebook.graph_version');

        if (! $pageId || ! $accessToken) {
            $this->warn('Facebook sync is disabled. Configure FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN.');

            return self::SUCCESS;
        }

        $authorId = User::query()->where('role', 'head')->where('status', 'active')->value('id')
            ?? User::query()->where('role', 'admin')->where('status', 'active')->value('id');

        if (! $authorId) {
            $this->error('Facebook posts cannot be imported because there is no active Head or Admin account.');

            return self::FAILURE;
        }

        $response = Http::acceptJson()
            ->withToken($accessToken)
            ->timeout(20)
            ->get("https://graph.facebook.com/{$graphVersion}/{$pageId}/posts", [
                'fields' => 'id,message,story,permalink_url,full_picture,created_time',
                'limit' => 10,
            ]);

        if (! $response->successful()) {
            $this->error('Facebook Graph API request failed: '.($response->json('error.message') ?? 'Unknown error'));

            return self::FAILURE;
        }

        $changed = 0;
        foreach ($response->json('data', []) as $post) {
            if (empty($post['id'])) {
                continue;
            }

            $message = trim((string) ($post['message'] ?? $post['story'] ?? ''));
            if ($message === '') {
                $message = 'New Facebook post from OSCA Bulan.';
            }
            $message = mb_substr($message, 0, 5000);
            $firstLine = Str::squish(Str::before($message, "\n"));
            $title = Str::limit($firstLine !== '' ? $firstLine : 'Facebook update', 180);

            // Include deleted announcements so a post Head removed is not imported again.
            $announcement = Announcement::withTrashed()->updateOrCreate(
                ['facebook_post_id' => $post['id']],
                [
                    'created_by' => $authorId,
                    'title' => $title,
                    'message' => $message,
                    'source_url' => $post['permalink_url'] ?? null,
                    'source_image_url' => $post['full_picture'] ?? null,
                    'published_at' => isset($post['created_time'])
                        ? Carbon::parse($post['created_time'])
                        : now(),
                ],
            );

            if ($announcement->wasRecentlyCreated || $announcement->wasChanged()) {
                $changed++;
            }
        }

        if ($changed > 0) {
            Cache::forget('announcements:dashboard');
        }

        $this->info("Facebook sync complete. {$changed} announcement(s) added or updated.");

        return self::SUCCESS;
    }
}