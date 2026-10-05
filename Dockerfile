FROM node:24-bookworm-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY backend/public/ /app/backend/public/
RUN npm run build:railway

FROM php:8.2-cli-bookworm AS php-base

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libxml2-dev libzip-dev \
    && docker-php-ext-install -j"$(nproc)" bcmath mbstring pdo_mysql xml zip \
    && rm -rf /var/lib/apt/lists/*

FROM php-base AS backend-build

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app/backend
COPY backend/ ./
COPY --from=frontend-build /app/backend/public/spa-assets ./public/spa-assets
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress --optimize-autoloader

FROM php-base AS runtime

WORKDIR /app/backend
COPY --from=backend-build /app/backend ./
RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

CMD ["sh", "-c", "php artisan storage:link --force && php artisan config:cache && exec php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"]
