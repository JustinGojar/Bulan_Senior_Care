<?php

namespace App\Support;

class PublicFilePolicy
{
    public static function blocked(string $uri): bool
    {
        return str_contains($uri, "\0") || str_contains($uri, '\\') || str_contains($uri, ':')
            || (bool) preg_match('#(?:^|/)\.|\.(?:php\d*|phtml|phar|env|log|sql|sqlite3?|pem|key|bak|map)(?:[./]|$)#i', $uri);
    }

    public static function publicUpload(string $uri): bool
    {
        return (bool) preg_match('#^/storage/(?:profile-photos|announcement-posters|announcement-comments)/[A-Za-z0-9]+\.(?:jpe?g|png|webp)$#i', $uri);
    }
}
