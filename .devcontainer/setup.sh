#!/usr/bin/env bash
set -e

echo "→ Installing PHP extensions..."
sudo apt-get update -qq
sudo apt-get install -y -qq php8.3-mysql php8.3-zip php8.3-intl php8.3-bcmath php8.3-gd php8.3-curl php8.3-xml php8.3-mbstring 2>/dev/null || true

echo "→ Installing Composer dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader

echo "→ Installing Node dependencies..."
npm ci

echo "→ Building frontend..."
npm run build

echo "→ Configuring environment..."
cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
APP_NAME=CRAMS
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=crams
DB_USERNAME=root
DB_PASSWORD=

CACHE_STORE=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
LOG_CHANNEL=single
EOF

echo "→ Setting up MySQL..."
sudo service mysql start 2>/dev/null || true
sleep 2
mysql -u root -e "CREATE DATABASE IF NOT EXISTS crams;" 2>/dev/null || true

echo "→ Generating app key..."
php artisan key:generate

echo "→ Running migrations and seeding..."
php artisan migrate --force --seed --no-interaction

echo "→ Linking storage..."
php artisan storage:link --force

echo "→ Creating demo account..."
php artisan crams:setup \
    --company="Demo Company" \
    --name="Demo Admin" \
    --email="admin@demo.com" \
    --password="password" 2>/dev/null || true

echo ""
echo "✅ CRAMS is ready!"
echo "   Starting server on port 8000..."
php artisan serve --host=0.0.0.0 --port=8000
