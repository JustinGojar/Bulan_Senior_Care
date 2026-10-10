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

# PHP's defaults (2M per file, 8M per request) reject posters and phone photos
# before validation runs; the app's own rules allow up to 10 MB per file.
RUN printf '%s\n' \
    'upload_max_filesize=12M' \
    'post_max_size=64M' \
    > /usr/local/etc/php/conf.d/uploads.ini

# Serve several requests at once (the built-in server reads this).
ENV PHP_CLI_SERVER_WORKERS=4

# public/router.php adds compression and cache headers that the built-in server lacks.
CMD ["sh", "-c", "php artisan storage:link --force && php artisan config:cache && php artisan route:cache && php artisan event:cache && exec php -S 0.0.0.0:${PORT:-8080} -t public public/router.php"]
