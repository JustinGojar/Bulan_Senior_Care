<?php

namespace App\Http\Middleware;

use App\Support\BrowserSecurity;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds browser hardening headers to every response Laravel sends. Static files
 * served directly by public/router.php set the same headers there.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only allow scripts from the build-owned shell, never API or user content.
        $shell = public_path('spa-assets/_shell.html');
        $html = $response instanceof BinaryFileResponse && $response->getFile()->getRealPath() === realpath($shell)
            ? file_get_contents($shell) : null;
        foreach (BrowserSecurity::headers($html) as $name => $value) {
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
        // Include login, validation errors and cookie-authenticated responses too.
        if ($request->is('api', 'api/*', 'sanctum/csrf-cookie', 'storage/*')) {
            $response->headers->set('Cache-Control', 'no-store, private');
        }

        return $response;
    }
}
