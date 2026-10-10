<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

class MessageController extends Controller
{
    public function unreadSummary(Request $request): JsonResponse
    {
        $count = Message::query()
            ->where('recipient_id', $request->user()->id)
            ->whereNull('recipient_deleted_at')
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

        $messages = Cache::remember($cacheKey, now()->addSeconds(3), fn () => Message::query()
            ->with(['sender:id,name,role,email', 'recipient:id,name,role,email'])
            ->visibleTo($userId)
            ->whereHas('sender')
            ->whereHas('recipient')
            ->latest()
            ->paginate($perPage, ['*'], 'page', $page)
            ->toArray());

        $partnerIds = collect($messages['data'])
            ->flatMap(fn (array $message) => [$message['sender_id'], $message['recipient_id']])
            ->reject(fn (int $id) => $id === $userId)
            ->unique()
            ->values()
            ->all();

        return response()->json([...$messages, 'online_user_ids' => $this->onlineUserIds($partnerIds)]);
    }

    /** Which of the given accounts are online now, so the inbox can show who is active. */
    public function presence(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'max:100'],
            'ids.*' => ['integer'],
        ]);

        return response()->json(['online_user_ids' => $this->onlineUserIds($data['ids'])]);
    }

    /**
     * An account is online while it holds a login token used in the last two minutes. An open
     * portal checks in every 15 seconds, and signing out deletes the token.
     *
     * @param  array<int, int>  $userIds
     * @return array<int, int>
     */
    private function onlineUserIds(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        return PersonalAccessToken::query()
            ->where('tokenable_type', User::class)
            ->whereIn('tokenable_id', $userIds)
            ->where('last_used_at', '>=', now()->subMinutes(2))
            ->distinct()
            ->pluck('tokenable_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
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
            // A message may be only a photo or file, so text is required only without one.
            'message' => ['nullable', 'required_without:attachment', 'string', 'max:5000'],
            'recipient_id' => ['required', 'integer', 'exists:users,id'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx', 'max:5120'],
        ]);
        $recipient = User::whereKey($data['recipient_id'])
            ->whereIn('role', ['leader', 'head'])
            ->where('status', 'active')
            ->first();
        abort_unless($recipient, 422, 'The selected account is not available.');

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $data['attachment_path'] = $file->store('message-attachments', 'public');
            $data['attachment_name'] = mb_substr($file->getClientOriginalName(), 0, 255);
            $data['attachment_mime'] = $file->getMimeType();
        }
        unset($data['attachment']);
        $data['message'] ??= '';

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

    /** Opening a conversation marks everything the other person sent you in it as read. */
    public function readConversation(Request $request, User $user): JsonResponse
    {
        $me = $request->user()->id;
        $updated = Message::query()
            ->where('sender_id', $user->id)
            ->where('recipient_id', $me)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
        if ($updated > 0) {
            $this->invalidateMessagesCache($me);
        }

        return response()->json(['updated' => $updated]);
    }

    /**
     * Removes the conversation from this account's inbox only; the other person keeps it.
     * Messages both people have deleted are removed for good, with their attachments.
     */
    public function destroyConversation(Request $request, User $user): JsonResponse
    {
        $me = $request->user()->id;
        abort_if($user->id === $me, 422, 'You cannot delete a conversation with yourself.');

        $conversation = Message::query()
            ->where(fn ($query) => $query
                ->where(fn ($pair) => $pair->where('sender_id', $me)->where('recipient_id', $user->id))
                ->orWhere(fn ($pair) => $pair->where('sender_id', $user->id)->where('recipient_id', $me)));
        $conversation->clone()->where('sender_id', $me)->whereNull('sender_deleted_at')->update(['sender_deleted_at' => now()]);
        $conversation->clone()->where('recipient_id', $me)->whereNull('recipient_deleted_at')->update(['recipient_deleted_at' => now()]);

        $goneForBoth = $conversation->clone()->whereNotNull('sender_deleted_at')->whereNotNull('recipient_deleted_at');
        Storage::disk('public')->delete($goneForBoth->clone()->whereNotNull('attachment_path')->pluck('attachment_path')->all());
        $goneForBoth->delete();
        $this->invalidateMessagesCache($me);

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
