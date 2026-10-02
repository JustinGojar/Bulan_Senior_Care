<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
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
