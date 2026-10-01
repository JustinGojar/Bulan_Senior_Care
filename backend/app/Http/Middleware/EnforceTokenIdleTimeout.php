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
        $lastActivity = $accessToken?->last_used_at ?? $accessToken?->created_at;
        $idleTimeout = (int) config('sanctum.idle_timeout', 0);

        if ($idleTimeout > 0 && $accessToken && $lastActivity?->lte(now()->subMinutes($idleTimeout))) {
            $accessToken->delete();

            return response()->json(['message' => 'Your session expired due to inactivity. Please log in again.'], 401);
        }

        return $next($request);
    }
}
