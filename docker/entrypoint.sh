#!/bin/sh
set -e

cd /var/www/backend

# Ensure .env exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        touch .env
    fi
fi

# Ensure APP_KEY exists in .env
if ! grep -q "APP_KEY=base64:" .env 2>/dev/null; then
    php artisan key:generate --force || true
fi

# If PORT is set by cloud provider (Render/Railway), update nginx port
if [ -n "$PORT" ]; then
    sed -i "s/listen 80/listen $PORT/g" /etc/nginx/nginx.conf
fi

# Ensure SQLite file if DB_CONNECTION is sqlite
if [ "$DB_CONNECTION" = "sqlite" ] || [ -z "$DB_CONNECTION" ]; then
    mkdir -p /var/www/backend/database
    touch /var/www/backend/database/database.sqlite
    chown -R www-data:www-data /var/www/backend/database
    chmod -R 777 /var/www/backend/database
fi

# Ensure uploads directory permissions
mkdir -p /var/www/backend/public/uploads
chown -R www-data:www-data /var/www/backend/public/uploads
chmod -R 775 /var/www/backend/public/uploads

# Create storage symlink
php artisan storage:link --force || true

# Run migrations
php artisan migrate --force || true

# Seed default database if empty
php artisan db:seed --force || true

# Cache configuration & routes for production speed
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Application prepared successfully. Starting Nginx and PHP-FPM..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
