<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SeniorCitizen extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'osca_id_number', 'barangay_id', 'encoded_by', 'last_name', 'first_name',
        'middle_name', 'suffix', 'birthdate', 'sex', 'contact_number', 'address',
        'civil_status', 'living_arrangement', 'registration_date', 'status',
        'photo_path', 'id_document_path', 'valid_id_path', 'birth_certificate_path',
    ];

    protected function casts(): array
    {
        return ['birthdate' => 'date', 'registration_date' => 'date'];
    }

    public function getRouteKeyName(): string
    {
        return 'osca_id_number';
    }

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    public function encoder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'encoded_by');
    }

    public function benefits(): BelongsToMany
    {
        return $this->belongsToMany(Benefit::class, 'benefit_transactions')->withPivot(['amount', 'status', 'period_label', 'date_distributed']);
    }
}
