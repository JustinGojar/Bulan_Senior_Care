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
