<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        $messages = Message::query()
            ->with(['sender:id,name,role,email', 'recipient:id,name,role,email'])
            ->where(fn ($query) => $query
                ->where('sender_id', $request->user()->id)
                ->orWhere('recipient_id', $request->user()->id))
            ->latest()
            ->get();

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

        return response()->json($message->load(['sender:id,name,role,email', 'recipient:id,name,role,email']), 201);
    }

    public function read(Request $request, Message $message): JsonResponse
    {
        abort_unless($message->recipient_id === $request->user()->id, 403, 'You cannot update this message.');
        $message->update(['read_at' => now()]);

        return response()->json($message->fresh());
    }

    public function destroyConversation(Request $request, User $user): JsonResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'You cannot delete a conversation with yourself.');

        Message::query()
            ->where(fn ($query) => $query
                ->where(fn ($pair) => $pair->where('sender_id', $request->user()->id)->where('recipient_id', $user->id))
                ->orWhere(fn ($pair) => $pair->where('sender_id', $user->id)->where('recipient_id', $request->user()->id)))
            ->delete();

        return response()->json(status: 204);
    }
}
