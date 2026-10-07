<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Http\Request;
use App\Http\Middleware\EnforceTokenIdleTimeout;
use App\Http\Middleware\SecurityHeaders;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->redirectGuestsTo(fn (Request $request) =>
            $request->is('api/*') ? null : route('login')
        );
        $middleware->append(SecurityHeaders::class);
        $middleware->alias([
            'token.idle' => EnforceTokenIdleTimeout::class,
        ]);
        $middleware->prependToPriorityList(AuthenticatesRequests::class, EnforceTokenIdleTimeout::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn (Request $request, \Throwable $exception) =>
            $request->is('api/*') || $request->expectsJson()
        );
    })->create();
