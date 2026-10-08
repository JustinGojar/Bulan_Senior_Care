<?php

namespace App\Providers;

use App\Mail\Transport\MailjetTransport;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // One password policy for account creation, resets, changes and admin edits.
        Password::defaults(fn () => Password::min(8)->mixedCase()->numbers()->symbols());

        // Signed-in traffic per account; generous enough for page loads, polling and exports.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(300)
            ->by($request->user()?->id ?: $request->ip()));

        // Private senior photos and documents, fetched one request per file.
        RateLimiter::for('files', fn (Request $request) => Limit::perMinute(600)
            ->by($request->user()?->id ?: $request->ip()));

        // Mail over HTTPS for hosts that block SMTP (Railway outside the Pro plan).
        Mail::extend('mailjet', fn (array $config) => new MailjetTransport(
            (string) config('services.mailjet.key'),
            (string) config('services.mailjet.secret'),
            (int) ($config['timeout'] ?? 10),
        ));

        // Stops one address from trying many accounts; the controller also limits each email.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));
    }
}
