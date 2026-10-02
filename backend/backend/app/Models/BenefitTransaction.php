<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BenefitTransaction extends Model
{
    protected $fillable = [
        'senior_citizen_id', 'benefit_id', 'distributed_by', 'date_distributed',
        'amount', 'period_label', 'status', 'reference_number', 'remarks', 'attachment_path',
        'created_by', 'updated_by',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}