<?php

namespace App\Http\Controllers;

use App\Support\AdvisorySettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'settings' => AdvisorySettings::all(),
            'configured' => [
                'email_advisories' => $this->emailIsConfigured(),
                'sms_advisories' => filled(config('services.semaphore.key')),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'email_advisories' => ['sometimes', 'boolean'],
            'sms_advisories' => ['sometimes', 'boolean'],
        ]);

        abort_if($data === [], 422, 'Select at least one notification channel to update.');
        if (($data['email_advisories'] ?? false) && ! $this->emailIsConfigured()) {
            abort(422, 'Configure a working mail transport and sender address before enabling email advisories.');
        }
        if (($data['sms_advisories'] ?? false) && ! filled(config('services.semaphore.key'))) {
            abort(422, 'Set SEMAPHORE_API_KEY in the backend environment before enabling SMS advisories.');
        }

        return response()->json([
            'settings' => AdvisorySettings::save($data),
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage notification channels.');
    }

    private function emailIsConfigured(): bool
    {
        $mailer = config('mail.default');
        if (in_array($mailer, ['log', 'array'], true) || blank(config('mail.from.address'))) {
            return false;
        }
        if ($mailer === 'smtp') {
            return filled(config('mail.mailers.smtp.host'))
                && filled(config('mail.mailers.smtp.username'))
                && filled(config('mail.mailers.smtp.password'));
        }

        return true;
    }
}
