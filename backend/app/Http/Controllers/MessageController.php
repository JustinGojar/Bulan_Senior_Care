<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MessageController extends Controller
{
    public function unreadSummary(Request $request): JsonResponse
    {
        $count = Message::query()
            ->where('recipient_id', $request->user()->id)
            ->whereNull('read_at')
            ->distinct('sender_id')
            ->count('sender_id');

        return response()->json(['count' => $count]);
    }

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(50, max(10, (int) $request->query('per_page', 25)));
        $version = $this->messagesCacheVersion($userId);
        $cacheKey = "messages:{$userId}:v{$version}:page{$page}:per{$perPage}";

        $messages = Cache::remember($cacheKey, now()->addSeconds(10), fn () => Message::query()
            ->with(['sender:id,name,role,email', 'recipient:id,name,role,email'])
            ->where(fn ($query) => $query
                ->where('sender_id', $userId)
                ->orWhere('recipient_id', $userId))
            ->whereHas('sender')
            ->whereHas('recipient')
            ->latest()
            ->paginate($perPage, ['*'], 'page', $page)
            ->toArray());

        return response()->json($messages);
    }

    public function recipients(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        return response()->json(
            User::query()
                ->whereIn('role', ['leader', 'head'])
                ->where('status', 'active')
                ->where('id', '!=', $request->user()->id)
                ->when($search !== '', fn ($query) => $query->where(fn ($match) =>
                    $match->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")))
                ->orderBy('name')
                ->limit(20)
                ->get(['id', 'name', 'email', 'role']),
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['admin', 'leader', 'head'], true), 403, 'This account cannot send messages.');

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:180'],
            'message' => ['required', 'string', 'max:5000'],
            'recipient_id' => ['required', 'integer', 'exists:users,id'],
        ]);
        $recipient = User::whereKey($data['recipient_id'])
            ->whereIn('role', ['leader', 'head'])
            ->where('status', 'active')
            ->first();
        abort_unless($recipient, 422, 'The selected account is not available.');

        $message = Message::create([
            ...$data,
            'sender_id' => $request->user()->id,
            'recipient_id' => $recipient->id,
        ]);
        $this->invalidateMessagesCache($request->user()->id, $recipient->id);

        return response()->json($message->load(['sender:id,name,role,email', 'recipient:id,name,role,email']), 201);
    }

    public function read(Request $request, Message $message): JsonResponse
    {
        abort_unless($message->recipient_id === $request->user()->id, 403, 'You cannot update this message.');
        $message->update(['read_at' => now()]);
        $this->invalidateMessagesCache($request->user()->id);

        return response()->json($message->fresh(['sender:id,name,role,email', 'recipient:id,name,role,email']));
    }

    public function destroyConversation(Request $request, User $user): JsonResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'You cannot delete a conversation with yourself.');

        Message::query()
            ->where(fn ($query) => $query
                ->where(fn ($pair) => $pair->where('sender_id', $request->user()->id)->where('recipient_id', $user->id))
                ->orWhere(fn ($pair) => $pair->where('sender_id', $user->id)->where('recipient_id', $request->user()->id)))
            ->delete();
        $this->invalidateMessagesCache($request->user()->id, $user->id);

        return response()->json(status: 204);
    }

    private function messagesCacheVersion(int $userId): int
    {
        return (int) Cache::get("messages:version:{$userId}", 1);
    }

    private function invalidateMessagesCache(int ...$userIds): void
    {
        foreach (array_unique($userIds) as $userId) {
            $key = "messages:version:{$userId}";
            Cache::forever($key, $this->messagesCacheVersion($userId) + 1);
        }
    }
}
