<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'sender_id', 'recipient_id', 'subject', 'message', 'attachment_path', 'attachment_name', 'attachment_mime', 'read_at',
        'sender_deleted_at', 'recipient_deleted_at',
    ];

    protected $hidden = ['sender_deleted_at', 'recipient_deleted_at'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime', 'sender_deleted_at' => 'datetime', 'recipient_deleted_at' => 'datetime'];
    }

    /** Messages this account sent or received and has not deleted from its own inbox. */
    public function scopeVisibleTo(Builder $query, int $userId): Builder
    {
        return $query->where(fn ($visible) => $visible
            ->where(fn ($sent) => $sent->where('sender_id', $userId)->whereNull('sender_deleted_at'))
            ->orWhere(fn ($received) => $received->where('recipient_id', $userId)->whereNull('recipient_deleted_at')));
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }
}
