# Security audit — 27 November 2026

This is a source, dependency, configuration, and local runtime audit of this checkout. The changes have not been deployed. No audit or automated test can guarantee the absence of vulnerabilities.

## Every requested action

| Request | Work completed | Verification or limitation |
| --- | --- | --- |
| Remove unused packages | Removed 54 unused root runtime dependencies and the unused Laravel Vite/Axios scaffold (3 direct packages). Backend npm commands now use the actual frontend build. Moved Tinker to development dependencies. Removed the obsolete Bun lockfile; npm lockfiles are authoritative. | Root lockfile contains only Playwright tooling and its dependencies; backend npm has no package dependencies. |
| Check for secrets | Added a redacted pattern scanner and scanned tracked files, public output, and 2,236 text blobs from locally available Git history. | No candidate matches. Heuristics do not identify every possible credential; remote-only Git history and host settings were not scanned. |
| Add rate limiting | Added 60/minute throttling to public announcements and 6/minute per-account throttling to password changes and administrator password resets. Retained login, recovery, API, backup, and download limits. Restricted which proxies may supply client-IP headers. | Tests prove the sensitive-action limit and that forged forwarded IPs from an untrusted client cannot bypass login limits. |
| Check user access | Fixed a missing barangay scope check when a president has been granted senior-delete permission. Preserved existing permission-driven read access. | Regression test denies deleting another barangay's record. Existing role and record-scope tests pass. |
| Hash passwords properly | Preserved Laravel's salted bcrypt hashing (local cost 12); added rehashing on successful custom login when the configured cost changes. Added a 72-byte limit to new passwords to prevent bcrypt truncation, including multibyte input. | Tests verify rehashing, hidden password fields, and rejection of oversized multibyte passwords. Existing passwords were not reset. |
| Hide API keys | Retained ignored backend environment files and Docker environment exclusions. Added a frontend build allowlist for public `VITE_*` configuration; unknown browser variables fail the build without printing values. | No configured local secret values appeared in built browser JS/HTML/CSS/JSON. Vite-prefixed variables are public, never a suitable location for credentials. |
| Proper authentication | Retained Sanctum tokens in HttpOnly, SameSite=Strict cookies, verification, inactive-account revocation, and idle expiry. Enforced Secure cookies in production and rejected unsafe cross-origin browser API requests before cookie authentication. | Cookie, login, recovery, inactivity, verification, and new origin tests pass. Explicit bearer clients still work. |
| Update dependencies | Updated 28 PHP packages, including Laravel 12.74.0 and Sanctum 4.5.0; applied compatible frontend updates. Replaced SheetJS 0.18.5 with the publisher's pinned 0.20.3 distribution. | Live npm audits report zero known vulnerabilities for root/frontend/backend; Composer reports no advisories or abandoned packages. No forced major-version migration. |
| Sanitize forms | Reviewed server-side validation and field allowlists. Added maximum lengths for senior address/family data, bounded login input, and capped spreadsheet imports at 5 MB. Parse only the first sheet and at most 502 rows, without formula/HTML metadata. | Profile mass-assignment test rejects privilege/password injection. Existing upload and validation tests pass. Data is escaped at output; legitimate text is not destructively stripped. |
| Protect against XSS | Retained React text escaping, escaped Word exports, hash-based CSP, blocked inline event handlers, and disallowed SVG profile uploads. Updated affected serialization/parser dependencies. | Export tests prove HTML is escaped and formula-like spreadsheet strings stay text. Browser smoke test proves unexpected inline JavaScript is blocked. |
| Turn off debug mode | Set local and example `APP_DEBUG=false` and logging level to warning. Production/non-local environments force application debug off. Docker defaults to production/debug-off and disables PHP display_errors. | Isolated HTTP test deliberately sets production `APP_DEBUG=true`, provokes an exception, and confirms database/stack details remain hidden. |
| Full security audit | Reviewed authentication, recovery, roles, records, uploads, backups, SQL construction, environment boundaries, browser rendering, build/deployment configuration, dependency advisories, and local Git history. Added repeatable checks and stricter CI audits. | This is not a live penetration test, infrastructure audit, malware scan, or guarantee. See remaining work below. |
| Check environment variables | Added `php artisan security:check`, which checks resolved configuration, including DB_URL overrides, without connecting to the database or printing secrets. Documented trusted proxies and public frontend variables. | The local environment correctly fails production checks for local/HTTP settings and the root/empty-password database connection. |
| Check exposed files | Hardened the PHP router against hidden files, traversal, script/backup/source-map paths, and arbitrary public-root files. Restricted public storage to intended image directories. Added Apache deny rules and Docker exclusions for storage data, database files, logs, and private keys. | HTTP tests verify .env, .git/config, .htaccess, traversal, and source-map requests return 404. JS/CSS/TTF assets still load. Apache and Docker were not run. |
| Protect admin routes | Prevented delegated password-reset/deactivation permissions from resetting or deleting an administrator account. Existing administrator-only create/edit/role/backup checks remain. | Tests prove delegated permissions cannot take over an administrator. Authorized non-admin read access is preserved. |
| Secure API endpoints | Applied the forced-password-change gate to private file endpoints, closing a bypass. Added origin checks, targeted throttles, and regression coverage for authorization and field injection. | Temporary-password accounts cannot download private senior files; guests receive JSON 401 responses. API responses retain no-store headers. |
| Check CORS | Retained exact configured origins, no wildcard/pattern grants, and no cross-origin credential allowance. Added origin checks for browser writes in addition to CORS. | Exact-origin allow and untrusted-origin deny tests pass. Production hosting origins still need confirmation. |
| Add security headers | Retained CSP, nosniff, DENY framing, referrer/permissions policies, and cross-origin opener protection. Added shared HSTS so static build responses receive it as well. | HTTP tests cover HTML, errors, and assets; browser smoke checks found no CSP violations in tested workflows. HSTS takes effect when served over HTTPS. |
| Secure database access | Reviewed bound Eloquent/query-builder SQL and the validated backup table allowlist. Enabled MySQL/MariaDB server-certificate verification when TLS is configured. Added checks for default superuser accounts and missing passwords. | A dedicated least-privilege database user, private networking/TLS, and grant verification remain required on the database host. No database accounts, passwords, records, or grants were changed. |

## Re-check results

- Backend: **248 tests passed, 2,072 assertions**, including 14 new security tests. Tests use isolated in-memory SQLite.
- Frontend: **9 Node tests and 10 Vitest tests passed**, including environment, HTML export, and spreadsheet export security checks.
- TypeScript: `npx tsc --noEmit` passed.
- ESLint: zero errors; one existing Fast Refresh warning in `SplashScreen.tsx`.
- Production build: `npm run build:railway` passed. The bundler emitted non-fatal dependency/module-directive warnings.
- Live dependency audits: zero known npm vulnerabilities and zero Composer advisories. Composer manifest and lockfile validation passed.
- Secret scan: zero candidate findings in tracked source/public output and 2,236 local-history text blobs. Built browser assets contained none of the configured local secret values checked.
- Isolated HTTP smoke: expected 200/401/403/404 responses, security/cache headers, production error suppression, asset MIME types, and secret-value checks passed.
- Existing headless browser smoke: all 11 checks passed, including desktop/mobile account dialogs, permission-dependent controls, temporary-password redirects, and CSP injection blocking. API writes were mocked.
- `git diff --check` passed.

Early re-checks caught a configuration-bootstrap ordering problem and incomplete new test fixtures; these were corrected before the final passing run. The default sandbox blocked frontend test workers, so those tests were rerun successfully with process permissions. The first HTTP smoke attempt could not use the local MySQL service; the successful final smoke used an isolated SQLite database and file sessions/cache. It therefore does not verify MySQL availability or grants.

## Remaining deployment work

1. **Database credentials:** the local backend still uses `root` with an empty password. The service was unavailable, so no safe grant inspection or account provisioning was possible. Create a dedicated user with a strong password and grants only on this application's database. Prefer SELECT/INSERT/UPDATE/DELETE at runtime and separate migration credentials. Do not expose the database port publicly; configure verified TLS for connections outside a trusted private network. Backups contain personal information and password hashes and must have restricted, encrypted storage.
2. **Production configuration:** set the real HTTPS APP_URL/FRONTEND_URL, production APP_ENV, provider credentials, and exact TRUSTED_PROXIES for the hosting path. Rebuild Laravel config and run `php artisan security:check`. Confirm forwarded headers resolve the real client IP without trusting arbitrary clients. A multi-instance deployment must share its rate-limit cache.
3. **Deployment and host verification:** deploy the reviewed changes and repeat HTTPS, cookie, CORS, file-exposure, and security-header checks against the actual URL. This audit did not access or modify hosting settings, rotate provider credentials, or publish the changes.
4. **Container/runtime:** Docker Desktop's daemon was unavailable, so the modified image was not built or run. Verify it in CI/on the host. The local PHP executable reports 8.2.12; update the local PHP runtime to a maintained patched release. The deployed runtime version was not inspected.
5. **Limits of the scans:** the pattern scanner is not a full secret-detection service. Verify hosted secret stores, old deployment artifacts, database grants, logs, external integrations, and remote-only history separately. Rotate any credential if evidence of exposure is found.

## Repeat the checks

From the repository root:

```powershell
python scripts/security-scan.py --history
python scripts/security-http-smoke.py
```

The HTTP smoke starts and stops a loopback-only PHP server, uses an in-memory database, and runs the existing headless-browser test. Build the frontend first. It intentionally exercises an error response and requires local PHP, Node, and Chrome or Edge.

From `backend`:

```powershell
php artisan test --compact
composer validate --no-check-publish
composer audit --locked
php artisan security:check
```

From `frontend`:

```powershell
npm ci
npx tsc --noEmit
npm test
npm run test:unit:run
npm run lint
npm run build:railway
npm audit --audit-level=moderate
```

Reference guidance: [Laravel password hashing/rehashing](https://laravel.com/docs/12.x/hashing) and [SheetJS publisher installation guidance](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/). An advisory-free dependency scan is evidence about known advisories, not proof that every dependency is safe.
