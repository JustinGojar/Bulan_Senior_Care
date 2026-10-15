<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks signed-in requests from accounts whose email address is not verified, so a
 * session that outlives an email change cannot reach restricted features.
 */
class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && ! $user->hasVerifiedEmail()) {
            $token = $user->currentAccessToken();
            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }

            return response()->json([
                'message' => 'Please verify your email address before continuing. Log in to get a new verification link.',
                'email_unverified' => true,
            ], 403)->withCookie(AuthenticateFromCookie::forget($request));
        }

        return $next($request);
    }
}
