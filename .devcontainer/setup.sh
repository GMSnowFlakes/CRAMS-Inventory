#!/usr/bin/env bash
set -e

echo "→ Installing PHP extensions..."
sudo apt-get update -qq
sudo apt-get install -y -qq php8.3-sqlite3 php8.3-zip php8.3-intl php8.3-bcmath php8.3-gd php8.3-curl php8.3-xml php8.3-mbstring 2>/dev/null || true

echo "→ Installing Composer dependencies..."
composer install --no-interaction --prefer-dist --optimize-autoloader

echo "→ Installing Node dependencies..."
npm ci

echo "→ Building frontend..."
npm run build

echo "→ Configuring environment..."
cat > .env << 'EOF'
APP_NAME=CRAMS
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
DB_DATABASE=/workspaces/CRAMS-Inventory/database/database.sqlite

CACHE_STORE=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
LOG_CHANNEL=single
EOF

echo "→ Creating SQLite database..."
mkdir -p database
touch database/database.sqlite

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
echo "   Login: admin@demo.com / password"
php artisan serve --host=0.0.0.0 --port=8000
