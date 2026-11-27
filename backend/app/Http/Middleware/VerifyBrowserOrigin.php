<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyBrowserOrigin
{
    public function handle(Request $request, Closure $next): Response
    {
        // Explicit bearer clients do not rely on ambient browser credentials.
        // Run before AuthenticateFromCookie turns the cookie into a bearer token.
        if ($request->is('api/*') && ! $request->isMethodSafe() && ! $request->bearerToken()) {
            $origin = $request->headers->get('Origin');
            $trusted = array_map(static fn ($url) => rtrim((string) $url, '/'), [
                config('app.url'), config('app.frontend_url'), $request->getSchemeAndHttpHost(),
            ]);
            if (($origin !== null && ! in_array($origin, $trusted, true))
                || $request->headers->get('Sec-Fetch-Site') === 'cross-site') {
                abort(403, 'Cross-site browser requests are not allowed.');
            }
        }

        return $next($request);
    }
}
