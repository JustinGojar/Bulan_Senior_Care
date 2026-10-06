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
    && docker-php-ext-install -j"$(nproc)" bcmath mbstring opcache pdo_mysql xml zip \
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

# Code is baked into the image, so compiled PHP never needs revalidating.
RUN printf '%s\n' \
    'opcache.enable=1' \
    'opcache.enable_cli=1' \
    'opcache.memory_consumption=128' \
    'opcache.max_accelerated_files=20000' \
    'opcache.validate_timestamps=0' \
    > /usr/local/etc/php/conf.d/opcache-production.ini

# Serve several requests at once; `artisan serve` only honours this with --no-reload.
ENV PHP_CLI_SERVER_WORKERS=4

CMD ["sh", "-c", "php artisan storage:link --force && php artisan config:cache && php artisan route:cache && php artisan event:cache && exec php artisan serve --no-reload --host=0.0.0.0 --port=${PORT:-8080}"]
