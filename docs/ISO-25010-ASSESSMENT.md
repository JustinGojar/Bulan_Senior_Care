# ISO/IEC 25010:2023 product quality assessment

Assessment of Bulan SeniorCare against the nine product quality characteristics of
[ISO/IEC 25010:2023](https://iso25000.com/index.php/en/iso-25000-standards/iso-25010).
It is based on a review of the source code and on running the project's own checks.
It is not a formal certification.

**Date:** 2026-10-26

## Checks that were run

| Check | Result |
| --- | --- |
| Backend test suite (`php artisan test`) | 192 tests passed, 1,712 assertions |
| `composer audit` | No advisories |
| Frontend type check (`tsc --noEmit`) | Passes |
| Frontend lint (`npm run lint`) | 1 formatting error in `profile.tsx`, now **fixed**. 1 warning remains. |
| Frontend production build (`build:railway`) | Passes |
| `npm audit --omit=dev` | 6 vulnerabilities (1 critical, 5 high). 5 **fixed** by updating the lockfile. 1 remains (`xlsx`, no fix released on npm). |

## Summary

| # | Characteristic | Rating | Main reason |
| --- | --- | --- | --- |
| 1 | Functional suitability | Meets | Covers registration, eligibility, benefits, reports, and administration. Backed by feature tests. |
| 2 | Performance efficiency | Partially meets | Caching, indexes, and compressed assets are in place. The PHP built-in server and missing load tests limit it. |
| 3 | Compatibility | Meets | REST/JSON API, CSV and Excel import, PDF and Excel export, PWA, several mail providers. |
| 4 | Interaction capability (usability) | Meets, with gaps | Role-based UI, validation, confirmations, themes, mobile layout. No formal accessibility audit. |
| 5 | Reliability | Partially meets | Health check, queue retries, backups, file recovery. A single server process limits availability. |
| 6 | Security | Meets, with gaps | HttpOnly cookie tokens, RBAC, barangay scoping, rate limits, audit log, security headers. One dependency vulnerability remains, and the CSP has no `script-src` rule. |
| 7 | Maintainability | Partially meets → improved | Clear layout and strong backend tests. Tests did not run automatically and the frontend has no unit tests. CI is now **added**. |
| 8 | Flexibility (portability) | Meets | Docker image, Railway or Vercel + Railway, settings through environment variables. |
| 9 | Safety | Meets | Confirmations, soft-delete archive, approval workflows, privacy consent, session timeout. |

## 1. Functional suitability

| Subcharacteristic | Evidence |
| --- | --- |
| Functional completeness | Senior registration (single and bulk), eligibility review, benefit programs, requests and releases, age milestones, reports and analytics, announcements, messaging, notifications, users, role permissions, audit logs, backups. |
| Functional correctness | 192 backend feature tests cover these workflows, for example `SeniorBulkUploadTest`, `BenefitReleaseBatchTest`, `ReportWorkflowTest`, and `MilestoneBenefitTest`. |
| Functional appropriateness | Each role works under its own path (`/admin`, `/head`, `/bsca`) and sees only its own tasks. |

## 2. Performance efficiency

| Subcharacteristic | Evidence | Gap |
| --- | --- | --- |
| Time behaviour | Short-lived caches for lists, overview, and analytics. Database indexes (for example `add_message_indexes`). Pre-compressed static assets. OPcache enabled. | No measured response times. |
| Resource utilization | Assets are split per route. Large export libraries (`xlsx`, `jspdf`) load only when the user exports. | — |
| Capacity | Rate limits protect the server (`api` 300/min, `files` 600/min). | Production runs `php -S` with 4 workers. Not tested under load. |

## 3. Compatibility

| Subcharacteristic | Evidence |
| --- | --- |
| Co-existence | One Docker service. Frontend and API share an origin. |
| Interoperability | JSON REST API (Postman workspace in `postman/`), CSV and Excel import, PDF and Excel export, Facebook Page import, SMTP, Brevo, Mailjet, and Gmail relay. |

## 4. Interaction capability (usability)

| Subcharacteristic | Evidence | Gap |
| --- | --- | --- |
| Appropriateness recognizability | Dashboards per role, clear navigation. | — |
| Learnability, self-descriptiveness | Labelled forms, status badges, tooltips. | No in-app help or user manual. |
| Operability | Searchable selects, filters, bulk upload, export menu, installable PWA. | — |
| User error protection | Form validation (`FormValidation.tsx`, `form-validation.ts`), confirm dialogs, unsaved-changes guard (`unsaved-changes.ts`). | — |
| Inclusivity | Light and dark themes, mobile layout (`use-mobile.tsx`), `aria-label` in 35 files, `lang="en"`. | No WCAG 2.1 AA audit. No Filipino or Bikol language option. |
| User assistance | Error pages (`StatusPage`, `error-page.ts`), offline page. | — |

## 5. Reliability

| Subcharacteristic | Evidence | Gap |
| --- | --- | --- |
| Faultlessness | Automated tests, typed frontend (TypeScript). | Tests did not run in CI (now fixed). |
| Availability | Health check `/up` in `railway.json`. Queue worker restarts automatically. | One instance, PHP built-in server. |
| Fault tolerance | Queue jobs retry 3 times. Files are restored from their database copy when missing (`PhotoBackup::restoreIfMissing`). | — |
| Recoverability | Database backup and restore (`BackupController`, `RestoreBackup` command, `BackupRestoreTest`). Soft-deleted archive with restore. | Backups are started by hand. No scheduled off-site backup. |

## 6. Security

| Subcharacteristic | Evidence | Gap |
| --- | --- | --- |
| Confidentiality | Token in an HttpOnly, `SameSite=Strict` cookie. Private files on a private disk with `no-store`. Leaders limited to their own barangay (`authorizeScope`). `Cache-Control: no-store` on signed-in API responses. | — |
| Integrity | Server-side validation on every endpoint. Database transactions for multi-step writes. | — |
| Non-repudiation, accountability | Audit log of record changes (`AuditLog`, `/audit-logs`). `encoded_by` and `updated_by` on records. | — |
| Authenticity | Sanctum tokens, email verification, password reset codes. Strong passwords (8+ characters with mixed case, numbers, and symbols). Idle timeout (30 min) and absolute expiry (12 h). | No two-factor sign-in for administrators. |
| Resistance | Login rate limits per IP and per email, HSTS, `X-Frame-Options`, `nosniff`, no public sign-up, admin role cannot be granted. `SecurityHardeningTest`, `LoginRateLimitTest`. | `xlsx@0.18.5` has known advisories and no npm fix. CSP has no `script-src`. |

## 7. Maintainability

| Subcharacteristic | Evidence | Gap |
| --- | --- | --- |
| Modularity, reusability | Laravel controllers, models, and `Support/` helpers. Shared UI components (`components/ui`). | `SeniorCitizenController` is about 800 lines. Split it into services when it grows. |
| Analysability | README, deployment guide, comments that explain intent, ESLint, Prettier. | — |
| Modifiability | Settings through environment variables. Admin manages role permissions at runtime. | — |
| Testability | 192 backend feature tests on in-memory SQLite. | No frontend unit or end-to-end tests. |

## 8. Flexibility (portability)

| Subcharacteristic | Evidence |
| --- | --- |
| Adaptability | Runs on Railway, or on Vercel + Railway. Supports several mail providers. |
| Scalability | The app keeps no session state on the server (token auth), so more instances can be added once a production web server is used. |
| Installability | Multi-stage `Dockerfile`, `railway.json`, migrations run on deploy, PWA install on Android. |
| Replaceability | Standard REST API and MySQL schema with migrations. |

## 9. Safety

| Subcharacteristic | Evidence |
| --- | --- |
| Operational constraint | Role permissions. Leader edits need Head approval (`SeniorEditRequest`). |
| Risk identification | Documents flagged for review. Age thresholds detected automatically. |
| Fail safe | Archive (soft delete) instead of hard delete. Restore from backup. Session timeout signs out idle users. |
| Hazard warning | Confirm dialogs for destructive actions. Logout and unsaved-changes prompts. |
| Safe integration | Data Privacy Consent recorded with each registration (RA 10173). Privacy, terms, and cookie policies are published. |

## Changes made with this assessment

1. **Added CI** (`.github/workflows/ci.yml`): runs backend tests, `composer audit`, type check, lint, build, and `npm audit` on pushes and pull requests. Supports *testability* and *faultlessness*.
2. **Fixed the lint error** in `frontend/src/routes/profile.tsx`.
3. **Updated vulnerable dependencies** in `frontend/package-lock.json` (`dompurify`, `js-yaml`, `source-map-js`, `vite`, `zod`). Supports *resistance*.

## Recommended next steps

| Priority | Action | Characteristic |
| --- | --- | --- |
| High | Replace `xlsx@0.18.5` with the SheetJS CDN build (`https://cdn.sheetjs.com`) or with `exceljs`. | Security |
| High | Serve PHP with a production server (for example FrankenPHP, or Nginx + PHP-FPM) instead of `php -S`. | Performance, reliability |
| Medium | Schedule automatic database backups to off-site storage. | Reliability |
| Medium | Add a `script-src` rule to the Content Security Policy. | Security |
| Medium | Add frontend tests (Vitest for logic, Playwright for key flows). | Maintainability |
| Medium | Run a WCAG 2.1 AA accessibility audit. Test with older users. | Interaction capability |
| Low | Add two-factor sign-in for the Administrator account. | Security |
| Low | Run a load test (for example k6) at expected peak use, such as release days. | Performance |
