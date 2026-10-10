<?php

namespace App\Models;

use App\Support\AgeThresholdNotifier;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SeniorCitizen extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Photos, IDs, birth certificates and benefit proofs live on the private disk and are only
     * served through signed-in, barangay-scoped API routes, never from /storage.
     */
    public const FILE_DISK = 'local';

    /** The file kinds the API serves, mapped to the column holding each path. */
    public const FILE_COLUMNS = [
        'photo' => 'photo_path',
        'id_document' => 'id_document_path',
        'valid_id' => 'valid_id_path',
        'birth_certificate' => 'birth_certificate_path',
    ];

    protected $fillable = [
        'osca_id_number', 'barangay_id', 'benefit_id', 'encoded_by', 'last_name', 'first_name',
        'middle_name', 'suffix', 'birthdate', 'place_of_birth', 'sex', 'contact_number', 'address',
        'civil_status', 'educational_attainment', 'other_skills', 'family_composition',
        'association_name', 'association_address', 'association_membership_date', 'association_position',
        'living_arrangement', 'registration_date', 'status',
        'photo_path', 'id_document_path', 'valid_id_path', 'birth_certificate_path',
        'privacy_consent_version', 'privacy_consent_at',
    ];

    protected static function booted(): void
    {
        // Alert the barangay leader as soon as a senior becomes active (e.g. approved)
        // or has their birthdate corrected, instead of waiting for the daily check.
        static::saved(function (SeniorCitizen $senior) {
            if ($senior->status === 'active'
                && ($senior->wasRecentlyCreated || $senior->wasChanged(['status', 'birthdate']))) {
                AgeThresholdNotifier::notify($senior);
            }
        });
    }

    protected function casts(): array
    {
        return ['birthdate' => 'date', 'registration_date' => 'date', 'privacy_consent_at' => 'datetime'];
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

    /** The program the senior is enrolled in. */
    public function benefit(): BelongsTo
    {
        return $this->belongsTo(Benefit::class);
    }

    /** Benefit records: one per release the senior was listed for. */
    public function benefits(): BelongsToMany
    {
        return $this->belongsToMany(Benefit::class, 'benefit_transactions')->withPivot(['amount', 'status', 'period_label', 'date_distributed']);
    }
}
