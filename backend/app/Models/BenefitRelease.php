<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BenefitRelease extends Model
{
    protected $fillable = [
        'benefit_id', 'period_label', 'amount', 'release_date', 'status', 'remarks', 'created_by', 'updated_by',
        'completed_at', 'completed_by',
    ];

    protected function casts(): array
    {
        return ['release_date' => 'date', 'amount' => 'decimal:2', 'completed_at' => 'datetime'];
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ReleaseDocument::class);
    }

    public function completer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function benefit(): BelongsTo
    {
        return $this->belongsTo(Benefit::class);
    }

    /** The barangays in this release batch; none means every barangay. */
    public function barangays(): BelongsToMany
    {
        return $this->belongsToMany(Barangay::class);
    }

    /** The seniors listed to receive the benefit in this batch. */
    public function transactions(): HasMany
    {
        return $this->hasMany(BenefitTransaction::class);
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