<?php

namespace App\Console\Commands;

use App\Models\SeniorCitizen;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RemoveSampleData extends Command
{
    protected $signature = 'osca:remove-sample-data {--execute : Permanently remove the identified samples}';

    protected $description = 'Remove SAMPLE-/DEMO- senior records and linked data, preserving every user account';

    public function handle(): int
    {
        $samples = DB::table('senior_citizens')->where(function ($query) {
            $query->where('osca_id_number', 'like', 'SAMPLE-%')->orWhere('osca_id_number', 'like', 'DEMO-%');
        });
        $this->info('Sample seniors (including archived): '.$samples->count());
        $this->info('Linked benefit transactions: '.DB::table('benefit_transactions')->whereIn('senior_citizen_id', (clone $samples)->select('id'))->count());
        $this->info('User accounts to preserve: '.DB::table('users')->count());
        if (! $this->option('execute')) {
            $this->info('Preview only. Use --execute to remove these samples.');
            return self::SUCCESS;
        }

        $deleted = DB::transaction(function () use ($samples) {
            $usersBefore = DB::table('users')->orderBy('id')->get()->toJson();
            $count = 0;
            foreach ((clone $samples)->pluck('id')->chunk(200) as $ids) {
                $requestIds = DB::table('benefit_requests')->whereIn('senior_citizen_id', $ids)->pluck('id');
                DB::table('notifications')->whereIn('source_type', ['age_threshold', 'registration_pending', 'registration_review', 'document_review'])
                    ->whereIn('source_id', $ids)->delete();
                DB::table('notifications')->where('source_type', 'benefit_request')->whereIn('source_id', $requestIds)->delete();
                // Foreign keys cascade to applications, forms, transactions, requests and edit requests.
                $count += DB::table('senior_citizens')->whereIn('id', $ids)->delete();
            }
            if ($usersBefore !== DB::table('users')->orderBy('id')->get()->toJson()) {
                throw new \RuntimeException('User accounts changed during cleanup; cleanup rolled back.');
            }
            return $count;
        });
        Cache::forever(SeniorCitizen::LIST_CACHE_VERSION_KEY, (string) Str::uuid());
        $this->info("Removed {$deleted} sample seniors and their linked records. All user accounts preserved.");
        return self::SUCCESS;
    }
}
