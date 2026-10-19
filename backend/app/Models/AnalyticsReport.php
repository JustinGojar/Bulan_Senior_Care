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
        'review_remarks',
        'status',
        'approved_by',
        'published_by',
        'published_at',
        'file_path',
        'snapshot',
    ];

    /** The snapshot can be large, so only the single-report endpoint returns it. */
    protected $hidden = ['snapshot'];

    protected function casts(): array
    {
        return [
            'generated_date' => 'date',
            'published_at' => 'datetime',
            'total_registered' => 'integer',
            'snapshot' => 'array',
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

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }
}
