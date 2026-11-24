<?php

namespace Tests\Feature;

use App\Support\BrowserSecurity;
use Tests\TestCase;

class BrowserSecurityTest extends TestCase
{
    public function test_login_validation_and_unauthorized_responses_are_not_cacheable(): void
    {
        foreach ([$this->postJson('/api/login', []), $this->getJson('/api/user'), $this->getJson('/api/unknown')] as $response) {
            $response->assertHeader('X-Frame-Options', 'DENY')
                ->assertHeader('X-Content-Type-Options', 'nosniff');
            $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
            $this->assertStringContainsString("script-src 'self'", $response->headers->get('Content-Security-Policy'));
        }
    }

    public function test_cors_does_not_allow_unconfigured_origins_or_arbitrary_localhost_ports(): void
    {
        config(['cors.allowed_origins' => ['https://portal.example.test']]);
        foreach (['https://evil.example', 'http://localhost:9999', 'https://portal.example.test.evil.example', 'null'] as $origin) {
            $response = $this->options('/api/login', [], [
                'Origin' => $origin,
                'Access-Control-Request-Method' => 'POST',
                'Access-Control-Request-Headers' => 'Content-Type',
            ])->assertHeader('X-Frame-Options', 'DENY');
            // A fixed trusted origin header also denies access to any different origin.
            $this->assertNotSame($origin, $response->headers->get('Access-Control-Allow-Origin'));
            $this->assertNotSame('*', $response->headers->get('Access-Control-Allow-Origin'));
        }
    }

    public function test_cors_allows_only_the_exact_configured_origin(): void
    {
        config(['cors.allowed_origins' => ['https://portal.example.test']]);
        $this->options('/api/login', [], [
            'Origin' => 'https://portal.example.test',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'Content-Type',
        ])->assertSuccessful()->assertHeader('Access-Control-Allow-Origin', 'https://portal.example.test')
            ->assertHeaderMissing('Access-Control-Allow-Credentials');
    }

    public function test_csp_hashes_preserve_exact_inline_script_bytes(): void
    {
        $script = "\r\nwindow.example = '\0';\r\n";
        $policy = BrowserSecurity::headers('<script>'.$script.'</script>')['Content-Security-Policy'];
        $this->assertStringContainsString("'sha256-".base64_encode(hash('sha256', "\nwindow.example = '\u{FFFD}';\n", true))."'", $policy);
        $this->assertStringNotContainsString("script-src 'self' 'unsafe-inline'", $policy);
        $this->assertStringContainsString("frame-src 'self' blob:", $policy);
        $this->assertStringContainsString("frame-ancestors 'none'", $policy);
    }
}
