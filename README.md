# Bulan SeniorCare

Bulan SeniorCare combines a React/Vite frontend with a Laravel 11 API and Railway MySQL. The `frontend/` app keeps its TanStack Router pages and features; the outer `backend/` Laravel app serves the production SPA and API.

## Local development

Run the frontend and backend in separate terminals:

```powershell
cd frontend
npm ci
npm run dev
```

```powershell
cd backend
composer install
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Configure local MySQL in `backend/.env`. In development the Vite server proxies `/api` and `/storage` to `http://127.0.0.1:8000` (override with `VITE_API_PROXY_TARGET`), so the API's HttpOnly, SameSite=Strict session cookie works. The API token is never exposed to page scripts or kept in browser storage, and the signed-in profile and API responses are held in memory only. Seeded demo accounts and the password `password` are for local development only.

## Railway deployment

The root `Dockerfile` builds the frontend and Laravel application into one Railway service. Laravel serves the generated React SPA shell and static assets, while its existing API remains available at `/api/*` on the same origin.

1. Connect this repository to a Railway service and set **Root Directory** to `/`. Keep the builder set to **Dockerfile** (the root `railway.json` selects it).
2. Leave Railway's separate **Build Command** unset. Railway builds the root Dockerfile; its frontend stage runs `npm ci` and `npm run build:railway`, and its PHP stage runs `composer install`.
3. Add Railway MySQL and set these variables on the application service:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_KEY`: generate with `php artisan key:generate --show` from `backend/`, then enter the value directly in Railway.
   - `APP_URL=https://<your-railway-domain>`
   - `FRONTEND_URL=https://<your-railway-domain>` (used for password-reset links; use the same origin as `APP_URL`)
   - `DB_CONNECTION=mysql`
   - `DB_URL=${{MySQL.MYSQL_URL}}` (replace `MySQL` with the exact Railway database service name)
   - `LOG_CHANNEL=stderr`
   - `FILESYSTEM_DISK=public`
4. Railway supplies `PORT` at runtime. The configured **Start Command** creates Laravel's storage symlink, caches production configuration, and runs `php artisan serve --host=0.0.0.0 --port=$PORT`.
5. The configured pre-deploy command runs `php artisan migrate --force`; `/up` is the health check. Add a Railway volume mounted at `/app/backend/storage/app/public` to retain uploaded photos and documents across deployments.

Set `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_ACCESS_TOKEN` as server-side Railway variables to enable Facebook Page imports. Never put the access token in a frontend variable or commit it. To run Facebook imports and daily scheduled tasks, configure a Railway Cron service using the same image to run `php artisan schedule:run` every minute.

Do not run the development seeder against production data. Configure mail variables separately if password-reset email is needed. Never commit `.env` files.

## Validation

```powershell
cd frontend
npm run build:railway
cd ../backend
php artisan route:list --path=api
php artisan test
```
