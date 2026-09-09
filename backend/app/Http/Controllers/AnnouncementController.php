<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\AnnouncementComment;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AnnouncementController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Cache::remember('announcements:dashboard', now()->addSeconds(10), fn () => Announcement::query()->with(['comments' => fn ($query) => $query->whereNull('parent_comment_id')->with(['user:id,name,role', 'replies'])])->latest('published_at')->latest('id')->get()->toArray()));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'head', 403, 'Only Head can create announcements.');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'message' => ['required', 'string', 'max:5000'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('announcement-posters', 'public');
        }
        unset($data['image']);

        $announcement = Announcement::create([
            ...$data,
            'created_by' => $request->user()->id,
            'published_at' => now(),
        ]);
        Cache::forget('announcements:dashboard');

        return response()->json($announcement->load('creator'), 201);
    }

    public function comment(Request $request, Announcement $announcement): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'parent_comment_id' => ['nullable', 'integer', 'exists:announcement_comments,id'],
        ]);

        if (! empty($data['parent_comment_id'])) {
            abort_unless(
                AnnouncementComment::whereKey($data['parent_comment_id'])->where('announcement_id', $announcement->id)->exists(),
                422,
                'The selected comment does not belong to this announcement.',
            );
        }

        $comment = AnnouncementComment::create([
            'announcement_id' => $announcement->id,
            'user_id' => $request->user()->id,
            'parent_comment_id' => $data['parent_comment_id'] ?? null,
            'message' => $data['message'],
        ]);
        Cache::forget('announcements:dashboard');

        $parentAuthor = ! empty($data['parent_comment_id'])
            ? AnnouncementComment::find($data['parent_comment_id'])?->user
            : $announcement->creator;
        if ($parentAuthor && $parentAuthor->id !== $request->user()->id) {
            Notification::create([
                'sender_account_id' => $request->user()->id,
                'recipient_account_id' => $parentAuthor->id,
                'message' => $request->user()->name.' replied to your comment on: '.$announcement->title,
                'source_type' => 'announcement',
                'source_id' => $announcement->id,
                'channel' => 'in_app',
                'date_sent' => now(),
                'status' => 'unread',
            ]);
        }

        return response()->json($comment->load('user:id,name,role'), 201);
    }
}
