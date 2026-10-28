# Email advisories

The email advisory switch is managed by Admin and saved in the database. When enabled:

- A scheduled or released benefit distribution emails the active barangay presidents in that batch.
- A newly registered senior awaiting validation emails the active presidents in the senior's barangay.

Configure the mail transport in the backend `.env` before enabling email. Never commit live credentials. Run `php artisan config:clear` after environment changes.

Advisories are queued. With the database queue, run `php artisan queue:work` continuously in the backend environment so queued messages are sent and failures are retried.
