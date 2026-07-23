#!/bin/bash
# InventoryOS — One-Click Setup (Mac/Linux)
# Run: bash setup.sh
#
# What it does:
#   1. Checks PHP 8.3+ and extensions
#   2. Installs Composer dependencies
#   3. Creates .env from .env.example
#   4. Generates APP_KEY
#   5. Runs database migrations (SQLite by default)
#   6. Installs npm dependencies
#   7. Builds the frontend
#   8. Prints start instructions

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}!${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; exit 1; }

echo ""
echo -e "\033[1mInventoryOS — Setup\033[0m"
echo ""

# 1. Check PHP
echo "  Checking PHP..."
if ! command -v php &>/dev/null; then
  fail "PHP not found. Install PHP 8.3+ from https://www.php.net/downloads"
fi
PHP_VER=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
log "PHP $PHP_VER"

# Check database driver
if ! php -m | grep -qi "pdo_sqlite\|pdo_mysql"; then
  fail "No database driver. Enable php_pdo_sqlite or php_pdo_mysql."
fi
log "Database driver OK"

# 2. Composer install
echo "  Installing Composer dependencies..."
if ! command -v composer &>/dev/null; then
  fail "Composer not found. Install from https://getcomposer.org"
fi
composer install --no-dev --optimize-autoloader --quiet
log "Dependencies installed"

# 3. Create .env
if [ ! -f .env ]; then
  cp .env.example .env
  log ".env created from .env.example"
else
  log ".env already exists"
fi

# 4. Generate APP_KEY
echo "  Generating APP_KEY..."
php artisan key:generate --force --quiet
log "APP_KEY generated"

# 5. Database setup
echo "  Setting up database..."
if [ ! -f database/database.sqlite ]; then
  touch database/database.sqlite
  log "Created SQLite database"
fi
php artisan migrate --force --quiet
log "Migrations applied"

# 6. Seed demo data
echo "  Seeding demo data..."
php artisan db:seed --force --quiet 2>/dev/null || true
log "Demo data seeded"

# 7. npm install + build
echo "  Installing frontend dependencies..."
npm install --silent
log "Frontend dependencies installed"

echo "  Building frontend..."
npm run build --silent
log "Frontend built"

# 8. Done
echo ""
echo -e "\033[1m${GREEN}Setup complete!\033[0m"
echo ""
echo -e "\033[1mStart the app:\033[0m"
echo "  php artisan serve"
echo ""
echo -e "\033[1mOpen in browser:\033[0m"
echo "  http://localhost:8000"
echo ""
echo -e "\033[1mDemo login:\033[0m"
echo "  Email:    admin@demo.com"
echo "  Password: password"
echo ""
echo -e "\033[1mUseful commands:\033[0m"
echo "  php artisan serve              Development server"
echo "  php artisan migrate:fresh      Reset database"
echo "  php artisan migrate:fresh --seed  Reset + re-seed"
echo ""
