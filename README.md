# Bulan SeniorCare

**Senior citizen profiling and benefit monitoring system for the Office of Senior Citizen Affairs (OSCA), Municipality of Bulan, Sorsogon.**

Bulan SeniorCare is a web-based portal that OSCA staff and barangay senior citizen leaders use to register senior citizens, review eligibility, and track the release of benefits. It also produces reports and descriptive analytics for the municipality. It can be installed on Android devices as a progressive web app (PWA).

---

## Table of contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Testing and validation](#testing-and-validation)
- [Deployment](#deployment)
- [Configuration reference](#configuration-reference)
- [Security and privacy](#security-and-privacy)

---

## Features

| Area | Capabilities |
| --- | --- |
| **Senior registration** | Encode profiles, photos, and supporting documents, or bulk-import a barangay list from CSV or Excel. A Data Privacy Consent form is recorded with each registration. |
| **Eligibility review** | The OSCA Head approves or rejects registrations with a reason. Flagged documents go back to the barangay leader for correction. |
| **Benefits** | Manage benefit programs, handle benefit requests, and record releases with rosters, payroll sheets, and claim forms (PDF). |
| **Age milestones** | Detect seniors who reach age thresholds automatically, with notifications. |
| **Reports and analytics** | Dashboards, descriptive analytics, and exportable reports (PDF and Excel) with an approval and publishing workflow. |
| **Communication** | Announcements (including imports from the OSCA Facebook Page), in-app messaging with attachments, and notifications. |
| **Administration** | User management, role permissions, audit logs, and database backups. |

### User roles

| Role | Scope |
| --- | --- |
| **Administrator** | Full system access, including user management and settings. |
| **OSCA Head** | Municipal records, eligibility decisions, age thresholds, reports, and analytics. |
| **Barangay leader (BSCA)** | Seniors and benefit requests of their own barangay. |

Each role works under its own URL prefix (`/admin`, `/head`, `/bsca`). Accounts are issued by the administrator; there is no public sign-up.

---

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, TanStack Start / Router / Query, Tailwind CSS 4, Radix UI |
| Backend | Laravel 12 (PHP 8.2+), Laravel Sanctum |
| Database | MySQL |
| Hosting | Railway (application and database); optionally Vercel for the frontend |
| Email | SMTP, Brevo, Mailjet, or a Gmail relay (see [`docs/gmail-relay`](docs/gmail-relay)) |

---

## Architecture

The repository holds two applications that ship as a single service:

- **`frontend/`**: a React single-page application (SPA) containing all pages and UI features.
- **`backend/`**: a Laravel REST API at `/api/*`. In production it also serves the built SPA, so the frontend and API share one origin.

Authentication uses an API token held in an **HttpOnly, `SameSite=Strict` cookie**. The token is never exposed to page scripts or saved in browser storage. Because the cookie must stay first-party, the browser always calls `/api` on the site's own origin:

- **Local development:** the Vite dev server proxies `/api` and `/storage` to Laravel.
- **Railway (single service):** Laravel serves both the SPA and the API.
- **Vercel + Railway:** Vercel forwards `/api` and `/storage` to the Railway backend.

---

## Repository structure

```
.
├── backend/            Laravel API (app, routes, migrations, seeders, tests)
├── frontend/           React SPA (routes, components, lib)
├── docs/               Deployment guide and Gmail relay script
├── postman/            Postman workspace settings
├── Dockerfile          Multi-stage build: frontend + Laravel in one image
└── railway.json        Railway build, deploy, and health-check settings
```

---

## Getting started

### Prerequisites

- Node.js 24 and npm
- PHP 8.2 or later and Composer
- MySQL 8

### 1. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Set the `DB_*` variables in `backend/.env` for your local MySQL database, then run:

```bash
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

The dev server proxies `/api` and `/storage` to `http://127.0.0.1:8000`. To point it elsewhere, set `VITE_API_PROXY_TARGET`.

### Demo accounts

The development seeder creates sample accounts (for example `admin@osca-bulan.gov.ph`) with the password `password`.

> [!WARNING]
> These accounts are for local development only. Never run the development seeder against a production database.

---

## Testing and validation

Run these before opening a pull request:

```bash
# Frontend: type check, lint, and production build
cd frontend
npx tsc --noEmit
npm run lint
npm run build:railway

# Backend: route check and test suite
cd ../backend
php artisan route:list --path=api
php artisan test
```

---

## Deployment

Two deployment setups are supported:

1. **Railway only (recommended):** one service built from the root `Dockerfile`. Steps follow below.
2. **Vercel (frontend) + Railway (backend):** see the full guide in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Railway

1. Connect this repository to a Railway service. Set **Root Directory** to `/` and keep the builder on **Dockerfile** (selected by `railway.json`). Leave **Build Command** unset.
2. Add a **MySQL** database to the project.
3. Set the application variables listed in the [configuration reference](#configuration-reference).
4. Add a volume mounted at **`/app/backend/storage/app`** so uploaded photos, documents, and attachments survive redeploys.

> [!IMPORTANT]
> Private files (senior documents, benefit proofs, release documents, and message attachments) are stored outside `storage/app/public`. A volume on the public folder alone does not keep them.

`railway.json` configures the rest:

| Step | Command |
| --- | --- |
| Pre-deploy | `php artisan migrate --force` |
| Start | Creates the storage link, caches configuration, starts a queue worker, and serves the app on `$PORT` |
| Health check | `GET /up` |

### Scheduled tasks

To run the scheduled tasks, add a Railway Cron service that uses the same image and runs `php artisan schedule:run` every minute:

| Task | Schedule |
| --- | --- |
| `osca:detect-age-thresholds` | Daily at 00:05 |
| `announcements:sync-facebook` | Every 15 minutes |

---

## Configuration reference

Set these on the Railway application service. Enter values directly in Railway, and **never commit `.env` files**.

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | Output of `php artisan key:generate --show` |
| `APP_URL` | `https://<your-domain>` |
| `FRONTEND_URL` | Same origin as `APP_URL` (used in password-reset links) |
| `DB_CONNECTION` | `mysql` |
| `DB_URL` | `${{MySQL.MYSQL_URL}}` (use your Railway database service name) |
| `LOG_CHANNEL` | `stderr` |
| `FILESYSTEM_DISK` | `public` |

**Optional integrations**

| Variable | Purpose |
| --- | --- |
| `MAIL_*` | Email for password resets and notifications. See `backend/.env.example` for the supported mailers. |
| `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN` | Facebook Page announcement imports. Server-side only. Never expose the token to the frontend. |
| `SANCTUM_IDLE_TIMEOUT`, `SANCTUM_EXPIRATION` | Session inactivity timeout and maximum session length, in minutes. |

---

## Security and privacy

- Personal information is processed under the **Data Privacy Act of 2012 (RA 10173)**. The portal publishes a [Privacy Policy](https://bulan-senior-care.vercel.app/privacy-policy), [Terms of Service](https://bulan-senior-care.vercel.app/terms-of-service), [Refund Policy](https://bulan-senior-care.vercel.app/refund-policy), and [Cookie Policy](https://bulan-senior-care.vercel.app/cookie-policy).
- Sessions use an HttpOnly cookie and expire after inactivity. Signed-in profile data and API responses are kept in memory only.
- Access is controlled by role-based permissions, and changes to records are written to an audit log.
- Private documents are served only to authorized, signed-in users.

To report a security issue, contact the repository owner directly rather than opening a public issue.

---

© Office of Senior Citizen Affairs, Municipality of Bulan, Sorsogon.
