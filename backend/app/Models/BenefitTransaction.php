<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BenefitTransaction extends Model
{
    protected $fillable = [
        'senior_citizen_id', 'benefit_id', 'distributed_by', 'date_distributed',
        'amount', 'period_label', 'status', 'remarks',
    ];

    protected function casts(): array
    {
        return ['date_distributed' => 'date', 'amount' => 'decimal:2'];
    }

    public function senior(): BelongsTo
    {
        return $this->belongsTo(SeniorCitizen::class, 'senior_citizen_id');
    }

    public function benefit(): BelongsTo
    {
        return $this->belongsTo(Benefit::class);
    }

    public function distributor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'distributed_by');
    }
}