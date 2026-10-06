# Email and SMS advisories

Email and SMS channel switches are managed by Admin and saved in the database. When enabled:

- A scheduled or released benefit distribution sends advisories to active barangay leaders by email and SMS, and to active seniors with a registered mobile number by SMS.
- A newly registered senior awaiting validation sends advisories to active leaders in the senior's barangay by email and SMS, and sends a validation reminder to that senior by SMS.

Configure the mail transport in the backend `.env` before enabling email. For SMS, set `SEMAPHORE_API_KEY` and optionally `SEMAPHORE_SENDER_NAME` from the Semaphore account. Never commit live credentials. Run `php artisan config:clear` after environment changes.

Advisories are queued. With the database queue, run `php artisan queue:work` continuously in the backend environment so queued messages are sent and failures are retried.
