<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeniorEditRequest extends Model
{
    protected $fillable = ['senior_citizen_id', 'requested_by', 'changes', 'status', 'reviewed_by', 'reviewed_at', 'remarks'];

    protected function casts(): array
    {
        return ['changes' => 'array', 'reviewed_at' => 'datetime'];
    }

    public function senior(): BelongsTo
    {
        return $this->belongsTo(SeniorCitizen::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}