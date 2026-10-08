# Deploying: Vercel (frontend) + Railway (backend)

```
Browser ──► https://your-app.vercel.app            (React SPA, Vercel)
              ├── /api/*      ──rewrite──► https://your-api.up.railway.app/api/*
              └── /storage/*  ──rewrite──► https://your-api.up.railway.app/storage/*
                                                    (Laravel + MySQL, Railway)
```

The browser only ever talks to the Vercel domain. Vercel forwards `/api` and `/storage`
to Railway, so the API's `SameSite=Strict`, HttpOnly session cookie stays first-party and
no CORS setup is needed. Do **not** point the frontend straight at the Railway URL — the
login cookie would be dropped as cross-site.

Deploy the backend first: Vercel needs its URL at build time.

---

## Part 1 — Backend on Railway

### 1. Create the project
1. Go to <https://railway.com> → **New Project** → **Deploy from GitHub repo** →
   pick `JustinGojar/Bulan_Senior_Care`.
2. Leave **Root Directory** empty (repo root). Railway reads `railway.json` and builds
   the root `Dockerfile`; it runs `php artisan migrate --force` before each deploy and
   health-checks `/up`.

### 2. Add MySQL
1. In the project canvas: **+ New** → **Database** → **MySQL**.
2. Wait until it is running.

### 3. Generate an app key
Run locally (in `backend/`):
```bash
php artisan key:generate --show
```
Copy the `base64:...` value.

### 4. Set the backend service variables
Open the Laravel service → **Variables** → **Raw Editor**, paste and adjust:

```env
APP_NAME="Bulan Senior Care"
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:PASTE_FROM_STEP_3
APP_TIMEZONE=Asia/Manila
APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://your-app.vercel.app

LOG_CHANNEL=stderr
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local

SANCTUM_IDLE_TIMEOUT=15
SANCTUM_EXPIRATION=720

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-gmail-address@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-gmail-address@gmail.com
MAIL_FROM_NAME="Bulan Senior Care"

SEMAPHORE_API_KEY=
SEMAPHORE_SENDER_NAME=
FACEBOOK_PAGE_ID=61588479000878
FACEBOOK_PAGE_ACCESS_TOKEN=
```

Notes:
- `MySQL` in `${{MySQL.…}}` must match your database service's name in Railway.
- `FRONTEND_URL` is used in password-reset emails. Use a placeholder now and fix it in Part 3.
- `QUEUE_CONNECTION=sync` because no queue worker runs. If you later add a worker
  service (`php artisan queue:work`), switch back to `database`.
- Gmail needs an **App Password** (Google Account → Security → 2-Step Verification → App passwords).

### 5. Give it a public URL
Service → **Settings** → **Networking** → **Generate Domain**. You get something like
`https://bulan-senior-care-production.up.railway.app`. Copy it.

### 6. Persistent uploads (photos, attachments)
Railway containers are wiped on every deploy. Keep uploaded files with a volume:
Service → **Settings** → **Volumes** → **Add volume**, mount path:
```
/app/backend/storage/app
```

### 7. Deploy and verify
Trigger a deploy (or push to the branch Railway watches), then open:
- `https://<railway-domain>/up` → should return a green "Application up" page.
- Logs should show the migrations ran.

### 8. Seed the first data / admin (once)
Install the Railway CLI, link the project, and run against the service:
```bash
npm i -g @railway/cli
railway login
railway link            # pick the project + Laravel service
railway ssh             # shell inside the running container
php artisan db:seed --force
```
This creates the barangays, roles, benefits and two accounts —
`admin@osca-bulan.gov.ph` and `head@osca-bulan.gov.ph`, both with password `password`.
**Sign in and change both passwords right away.** It also runs `SampleDataSeeder`
(demo seniors); remove that line from `DatabaseSeeder` first if you want a clean
production database.

---

## Part 2 — Frontend on Vercel

### 1. Import the repo
<https://vercel.com/new> → import `JustinGojar/Bulan_Senior_Care`.

### 2. Project settings
| Setting | Value |
|---|---|
| Framework Preset | **Other** |
| Root Directory | `frontend` |
| Build Command | `npm run build` (default) |
| Output Directory | leave default (the build writes `.vercel/output` itself) |
| Install Command | `npm install` (default) |
| Node.js Version (Settings → General) | 22.x or newer |

### 3. Environment variable
| Name | Value | Environments |
|---|---|---|
| `BACKEND_URL` | `https://<railway-domain>` (no trailing slash) | Production, Preview |

`BACKEND_URL` is read at **build** time and becomes Vercel's `/api` and `/storage`
rewrites. Changing it needs a redeploy.

### 4. Deploy
Click **Deploy**. Note the URL, e.g. `https://bulan-senior-care.vercel.app`.

---

## Part 3 — Connect the two

1. Railway → Laravel service → **Variables**: set `FRONTEND_URL` to the Vercel URL
   (your custom domain later, if you add one). Railway redeploys.
2. Open the Vercel URL and sign in. Check in DevTools → Network that `/api/...`
   requests go to the Vercel domain and return 200.
3. Test a photo upload and that the image shows (served via `/storage`).
4. Test "Forgot password" — the emailed link should point to the Vercel URL.

---

## Custom domain (optional)
- Vercel → Project → **Settings → Domains** → add `seniorcare.example.com`, follow the DNS steps.
- Then update `FRONTEND_URL` on Railway to that domain.
- The Railway API domain can stay as the `*.up.railway.app` one; users never see it.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Login succeeds but next request is 401 | The frontend is calling the Railway URL directly. Make sure `BACKEND_URL` is set on Vercel and redeploy. |
| `/api/...` returns the app's HTML on Vercel | `BACKEND_URL` was missing at build time; set it and redeploy. |
| Railway deploy fails at pre-deploy | Check DB variables; the `migrate --force` step needs MySQL reachable. |
| 500 errors with no detail | Temporarily set `APP_DEBUG=true` on Railway, read the logs, set it back to `false`. |
| Uploaded photos vanish after a deploy | Volume missing or mounted at the wrong path (see Part 1 step 6). |
| Password-reset link goes to localhost | `FRONTEND_URL` not set on Railway. |

## Note
Railway still builds the SPA into Laravel too (the Dockerfile), so the Railway URL also
serves a working copy of the site. That is harmless; Vercel is the public entry point.
