<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $fillable = ['actor_id', 'action', 'target_type', 'target_id', 'before_value', 'after_value'];

    protected function casts(): array
    {
        return [
            'before_value' => 'array',
            'after_value' => 'array',
        ];
    }

    public static function record(User $actor, string $action, Model $target, ?array $beforeValue = null, ?array $afterValue = null): void
    {
        self::query()->create([
            'actor_id' => $actor->id,
            'action' => $action,
            'target_type' => $target::class,
            'target_id' => $target->getKey(),
            'before_value' => $beforeValue,
            'after_value' => $afterValue,
        ]);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
