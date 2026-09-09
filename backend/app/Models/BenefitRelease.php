<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BenefitRelease extends Model
{
    protected $fillable = [
        'benefit_id', 'period_label', 'amount', 'release_date', 'status', 'remarks', 'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return ['release_date' => 'date', 'amount' => 'decimal:2'];
    }

    public function benefit(): BelongsTo
    {
        return $this->belongsTo(Benefit::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}