<?php

namespace App\Support;

class BrowserSecurity
{
    public static function headers(?string $trustedHtml = null): array
    {
        $headers = json_decode(file_get_contents(__DIR__.'/../../resources/browser-security.json'), true, flags: JSON_THROW_ON_ERROR);
        if ($trustedHtml !== null) {
            preg_match_all('#<script\b[^>]*>(.*?)</script\s*>#is', $trustedHtml, $scripts);
            // HTML parsing normalizes line endings and replaces NUL before CSP hashing.
            $hashes = array_unique(array_map(
                static fn (string $script): string => "'sha256-".base64_encode(hash('sha256', str_replace(["\r\n", "\r", "\0"], ["\n", "\n", "\u{FFFD}"], $script), true))."'",
                array_filter($scripts[1]),
            ));
            $headers['Content-Security-Policy'] = str_replace("script-src 'self'", "script-src 'self' ".implode(' ', $hashes), $headers['Content-Security-Policy']);
        }

        return $headers;
    }
}
