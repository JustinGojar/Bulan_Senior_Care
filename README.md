# Bulan SeniorCare

**Senior citizen profiling and benefit monitoring system for the Office of Senior Citizen Affairs (OSCA), Municipality of Bulan, Sorsogon.**

Bulan SeniorCare is a web-based portal that OSCA staff and barangay senior citizen presidents use to register senior citizens, review eligibility, and track the release of benefits. It also produces reports and descriptive analytics for the municipality. It can be installed on Android devices as a progressive web app (PWA).

---

## Table of contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Security and privacy](#security-and-privacy)

---

## Features

| Area | Capabilities |
| --- | --- |
| **Senior registration** | Encode profiles, photos, and supporting documents, or bulk-import a barangay list from CSV or Excel. A Data Privacy Consent form is recorded with each registration. |
| **Eligibility review** | The OSCA Head approves or rejects registrations with a reason. Flagged documents go back to the barangay president for correction. |
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
| **Barangay president (BSCA)** | Seniors and benefit requests of their own barangay. |

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

The development seeder creates sample accounts for each role. Their sign-in details are defined in `backend/database/seeders/DatabaseSeeder.php`.

> [!WARNING]
> These accounts are for local development only. Never run the development seeder against a production database.

---


## Security and privacy

- Personal information is processed under the **Data Privacy Act of 2012 (RA 10173)**. The portal publishes a Privacy Policy, Terms of Service, Refund Policy, and Cookie Policy at `/privacy-policy`, `/terms-of-service`, `/refund-policy`, and `/cookie-policy`.
- Sessions use an HttpOnly cookie and expire after inactivity. Signed-in profile data and API responses are kept in memory only.
- Access is controlled by role-based permissions, and changes to records are written to an audit log.
- Private documents are served only to authorized, signed-in users.

To report a security issue, contact the repository owner directly rather than opening a public issue.

---

© Office of Senior Citizen Affairs, Municipality of Bulan, Sorsogon.
