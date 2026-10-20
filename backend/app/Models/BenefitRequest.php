<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BenefitRequest extends Model
{
    /** Waiting for the Head, approved for release, turned down, or given to the senior. */
    public const STATUSES = ['for_verification', 'approved', 'rejected', 'released'];

    /** A request still in progress; a senior has at most one per benefit. */
    public const OPEN_STATUSES = ['for_verification', 'approved'];

    protected $fillable = [
        'senior_citizen_id', 'benefit_id', 'requested_by', 'status', 'remarks',
        'verified_by', 'verified_at', 'rejection_reason', 'period_label', 'release_date',
        'released_by', 'benefit_transaction_id',
    ];

    protected function casts(): array
    {
        return ['verified_at' => 'datetime', 'release_date' => 'date'];
    }

    public function senior(): BelongsTo
    {
        return $this->belongsTo(SeniorCitizen::class, 'senior_citizen_id');
    }

    public function benefit(): BelongsTo
    {
        return $this->belongsTo(Benefit::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function releaser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(BenefitTransaction::class, 'benefit_transaction_id');
    }
}
