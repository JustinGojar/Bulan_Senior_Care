<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Announcement;
use App\Support\AgeThresholdNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class NotificationController extends Controller
{
    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::query()
            ->where('recipient_account_id', $request->user()->id)
            ->where('status', 'unread')
            ->count();

        return response()->json(['count' => $count]);
    }

    public function index(Request $request): JsonResponse
    {
        // Fallback when the daily scheduler isn't running: check the leader's barangay
        // for seniors who have reached a benefit age, at most once per day.
        $user = $request->user();
        if ($user->role === 'leader' && $user->barangay_id
            && Cache::add("age-threshold-check:{$user->barangay_id}:".today()->toDateString(), true, now()->endOfDay())) {
            AgeThresholdNotifier::notifyAll($user->barangay_id);
        }

        $announcements = Announcement::query()->get(['id', 'title']);
        $notifications = Notification::query()
                ->where('recipient_account_id', $request->user()->id)
                ->with('sender:id,name,role')
                ->latest('created_at')
                ->get();

        return response()->json($notifications->map(function (Notification $notification) use ($announcements) {
            if (! $notification->source_id) {
                $announcement = $announcements->first(fn (Announcement $item) => str_contains($notification->message, $item->title));
                if ($announcement) {
                    $notification->source_type = 'announcement';
                    $notification->source_id = $announcement->id;
                }
            }

            return $notification;
        }));
    }

    public function read(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->recipient_account_id === $request->user()->id, 403);
        $notification->update(['status' => 'read']);

        return response()->json($notification->fresh());
    }

    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->recipient_account_id === $request->user()->id, 403);
        $notification->delete();

        return response()->json(status: 204);
    }

    public function clear(Request $request): JsonResponse
    {
        Notification::where('recipient_account_id', $request->user()->id)->delete();

        return response()->json(status: 204);
    }
}
