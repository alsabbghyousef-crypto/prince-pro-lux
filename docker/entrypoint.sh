#!/bin/sh
set -e

cd /var/www/backend

# If PORT is set by cloud provider (Render/Railway), update nginx port
if [ -n "$PORT" ]; then
    sed -i "s/listen 80/listen $PORT/g" /etc/nginx/nginx.conf
fi

# Ensure SQLite file if DB_CONNECTION is sqlite
if [ "$DB_CONNECTION" = "sqlite" ] || [ -z "$DB_CONNECTION" ]; then
    mkdir -p /var/www/backend/database
    touch /var/www/backend/database/database.sqlite
    chown -R www-data:www-data /var/www/backend/database
fi

# Generate APP_KEY if not provided
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

# Create storage symlink
php artisan storage:link --force || true

# Run migrations
php artisan migrate --force || true

# Cache configuration & routes for production speed
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo "Application prepared successfully. Starting Nginx and PHP-FPM..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
