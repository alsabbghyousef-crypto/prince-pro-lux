# ── Stage 1: Build Frontend ──
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

# ── Stage 2: Production PHP + Nginx ──
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    sqlite \
    sqlite-dev \
    oniguruma-dev

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo pdo_mysql pdo_sqlite mbstring zip bcmath opcache

# Configure PHP upload limits & memory
RUN echo "upload_max_filesize = 64M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 64M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/uploads.ini

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy backend
COPY public_html/backend /var/www/backend

# Install backend dependencies & prepare initial .env
WORKDIR /var/www/backend
RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && cp .env.example .env \
    && php artisan key:generate --ansi

# Copy frontend build from stage 1
COPY --from=frontend-builder /app/frontend/dist /var/www/frontend

# Copy configs
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set permissions
RUN chown -R www-data:www-data /var/www/backend/storage /var/www/backend/bootstrap/cache /var/www/backend/public \
    && chmod -R 775 /var/www/backend/storage /var/www/backend/bootstrap/cache /var/www/backend/public

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
