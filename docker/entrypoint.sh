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
mkdir -p /var/www/backend/public/uploads/datasheets
mkdir -p /var/www/backend/public/uploads/products
chown -R www-data:www-data /var/www/backend/public
chmod -R 777 /var/www/backend/public

# Ensure storage directory & log permissions
mkdir -p /var/www/backend/storage/logs /var/www/backend/storage/framework/views /var/www/backend/storage/framework/cache /var/www/backend/storage/framework/sessions
touch /var/www/backend/storage/logs/laravel.log
chown -R www-data:www-data /var/www/backend/storage
chmod -R 777 /var/www/backend/storage
chmod 666 /var/www/backend/storage/logs/laravel.log

# Ensure nginx body/fastcgi temp directories exist with full permissions
mkdir -p /tmp/client_body /tmp/fastcgi_temp /tmp/proxy_temp /var/lib/nginx/tmp/client_body /var/lib/nginx/tmp/fastcgi
chown -R www-data:www-data /tmp/client_body /tmp/fastcgi_temp /tmp/proxy_temp /var/lib/nginx
chmod -R 777 /tmp/client_body /tmp/fastcgi_temp /tmp/proxy_temp /var/lib/nginx

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

# Final storage permission fix after artisan commands
chown -R www-data:www-data /var/www/backend/storage
chmod -R 777 /var/www/backend/storage

echo "Application prepared successfully. Starting Nginx and PHP-FPM..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
