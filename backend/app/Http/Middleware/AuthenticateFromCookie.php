<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets the portal authenticate with its API token held in an HttpOnly cookie, so the token
 * never sits in browser storage where page scripts could read it. The cookie is only honoured
 * on requests carrying X-Requested-With, a header other sites cannot send without a CORS
 * preflight, which keeps cross-site forms from riding on the cookie.
 */
class AuthenticateFromCookie
{
    public const COOKIE = 'bulan_api_token';

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->cookies->get(self::COOKIE);

        if (is_string($token) && $token !== '' && ! $request->bearerToken()
            && $request->headers->get('X-Requested-With') === 'XMLHttpRequest') {
            $request->headers->set('Authorization', 'Bearer '.$token);
        }

        return $next($request);
    }

    public static function issue(Request $request, string $token): Cookie
    {
        $expiration = (int) config('sanctum.expiration');

        return Cookie::create(
            self::COOKIE,
            $token,
            $expiration > 0 ? now()->addMinutes($expiration) : 0,
            '/api',
            null,
            $request->isSecure(),
            true,
            true,
            Cookie::SAMESITE_STRICT,
        );
    }

    public static function forget(Request $request): Cookie
    {
        return Cookie::create(self::COOKIE, null, 1, '/api', null, $request->isSecure(), true, true, Cookie::SAMESITE_STRICT);
    }
}
