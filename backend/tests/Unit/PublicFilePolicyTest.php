<?php

namespace Tests\Unit;

use App\Support\PublicFilePolicy;
use PHPUnit\Framework\TestCase;

class PublicFilePolicyTest extends TestCase
{
    public function test_sensitive_paths_and_traversal_are_blocked(): void
    {
        foreach (['/.env', '/.git/config', '/.htaccess', '/spa-assets/../index.php', '/spa-assets/test.MAP', '/storage/a.php.jpg', '/backup.sql', '/foo\\bar', '/foo:bar', "/foo\0bar"] as $path) {
            $this->assertTrue(PublicFilePolicy::blocked($path), $path);
        }
        $this->assertFalse(PublicFilePolicy::blocked('/spa-assets/assets/main-Ab12.js'));
    }

    public function test_only_intentionally_public_image_directories_are_served(): void
    {
        foreach (['/storage/senior-documents/a.pdf', '/storage/senior-photos/a.jpg', '/storage/message-attachments/a.jpg', '/storage/profile-photos/a.svg', '/storage/profile-photos/a.php.jpg'] as $path) {
            $this->assertFalse(PublicFilePolicy::publicUpload($path));
        }
        $this->assertTrue(PublicFilePolicy::publicUpload('/storage/profile-photos/Ab123.jpg'));
        $this->assertTrue(PublicFilePolicy::publicUpload('/storage/announcement-posters/Ab123.webp'));
    }
}
