<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePasswordChange
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowedUris = ['api/user', 'api/logout', 'api/profile/password'];
        if ($request->user()?->must_change_password && ! in_array($request->route()?->uri(), $allowedUris, true)) {
            return response()->json([
                'message' => 'Change your temporary password before continuing.',
                'must_change_password' => true,
            ], 423);
        }

        return $next($request);
    }
}
