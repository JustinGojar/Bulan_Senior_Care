<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalyticsReport extends Model
{
    protected $fillable = [
        'generated_by',
        'barangay_id',
        'generated_date',
        'report_type',
        'total_registered',
        'remarks',
        'status',
        'approved_by',
        'published_at',
        'file_path',
    ];

    protected function casts(): array
    {
        return [
            'generated_date' => 'date',
            'published_at' => 'datetime',
            'total_registered' => 'integer',
        ];
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
