<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnforceTokenIdleTimeout
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainTextToken = $request->bearerToken();

        if (! $plainTextToken) {
            return $next($request);
        }

        $accessToken = PersonalAccessToken::findToken($plainTextToken);

        if ($accessToken) {
            // Revoke the token as soon as the owning account is removed or deactivated,
            // so disabling a user cuts off any session they already hold.
            $owner = $accessToken->tokenable;
            if (! $owner || $owner->status === 'inactive') {
                $accessToken->delete();

                return response()->json(['message' => 'Your account is no longer active. Please contact an administrator.'], 401);
            }

            $lastActivity = $accessToken->last_used_at ?? $accessToken->created_at;
            $idleTimeout = (int) config('sanctum.idle_timeout', 0);

            if ($idleTimeout > 0 && $lastActivity?->lte(now()->subMinutes($idleTimeout))) {
                $accessToken->delete();

                return response()->json(['message' => 'Your session expired due to inactivity. Please log in again.'], 401);
            }
        }

        return $next($request);
    }
}
