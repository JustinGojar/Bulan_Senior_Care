# Bulan SeniorCare

Bulan SeniorCare is split into two independent applications:

- `frontend/` - React, Vite, TanStack Router, TailwindCSS, and Recharts
- `backend/` - Laravel 11 API, Sanctum, Spatie permissions, and MySQL

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Backend

```powershell
cd backend
composer install
php artisan migrate --seed
php artisan serve --port=8000
```

Configure the MySQL database in `backend/.env`. The API is available under `/api` and is documented in [backend/README.md](backend/README.md).

## Production Deployment

The frontend is deployed to Vercel and the Laravel API plus MySQL are deployed to Railway. Deploy the API first so its public URL is available for the frontend build.

### Railway API

1. Create a Railway project with a service connected to this repository. Set the service Root Directory to `/backend` and add a Railway MySQL service.
2. Let Railway detect the Laravel app with Railpack. With the service Root Directory set to `/backend`, `backend/railway.json` configures the build command to run `php artisan config:clear` before `php artisan storage:link --force`. Keep the pre-deploy command set to `php artisan migrate --force` and the health check path set to `/up`.
3. Add these variables to the Laravel service:

	- `APP_ENV=production`
	- `APP_DEBUG=false`
	- `APP_KEY`: generate with `php artisan key:generate --show` from `backend/`, then enter the value directly in Railway.
	- `APP_URL`: the public Railway API origin, without `/api`.
	- `FRONTEND_URL=https://bulan-senior-care.vercel.app`
	- `DB_CONNECTION=mysql`
	- `DB_URL=${{MySQL.MYSQL_URL}}`, replacing `MySQL` with the exact name of the database service.
	- `LOG_CHANNEL=stderr`
	- `FILESYSTEM_DISK=public`

4. Generate a public domain for the Railway API. Add a Railway volume mounted at `/app/storage/app/public` to preserve uploaded photos and documents. The build command creates the Laravel `public/storage` symlink to that persistent path.

Do not run the development seeder against production data. Configure mail variables separately if password-reset email is needed.

### Vercel Frontend

1. In the existing Vercel project, set Root Directory to `frontend`, Framework Preset to **TanStack Start**, and Node.js Version to **24.x**. The `frontend/vercel.json` file makes framework detection explicit.
2. Add `VITE_API_URL` for the Production environment, using the public Railway domain followed by `/api`, for example `https://<railway-domain>/api`. This URL is public and is compiled into the browser bundle; do not put credentials in it.
3. Confirm `osca.io` is assigned to the Vercel project, then deploy. Redeploy after changing Vercel environment variables.

The API's CORS allowlist includes `https://bulan-senior-care.vercel.app` and the origin in `FRONTEND_URL`. Keep `FRONTEND_URL` set to the exact production frontend origin. Preview deployments need their own CORS policy before they can call the production API. When deploying CORS configuration or environment changes, regenerate Laravel's config cache so the running service uses the updated allowlist.
