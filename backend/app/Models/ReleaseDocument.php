<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReleaseDocument extends Model
{
    protected $fillable = ['benefit_release_id', 'path', 'original_name', 'mime_type', 'size', 'uploaded_by'];

    public function release(): BelongsTo
    {
        return $this->belongsTo(BenefitRelease::class, 'benefit_release_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
