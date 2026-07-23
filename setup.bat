@echo off
:: InventoryOS — One-Click Setup (Windows)
:: Run: setup
::
:: What it does:
::   1. Checks PHP 8.3+ and extensions
::   2. Installs Composer dependencies
::   3. Creates .env from .env.example
::   4. Generates APP_KEY
::   5. Runs database migrations (SQLite by default)
::   6. Installs npm dependencies
::   7. Builds the frontend
::   8. Prints start instructions

echo.
echo  InventoryOS — Setup
echo  ═══════════════════
echo.

:: 1. Check PHP
echo  Checking PHP...
php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo  X PHP not found. Install PHP 8.3+ from https://www.php.net/downloads
    echo    Or use: winget install PHP.PHP
    pause
    exit /b 1
)
for /f "tokens=2 delims= " %%a in ('php -v 2^>nul ^| findstr /b "PHP"') do set PHPVER=%%a
echo    PHP %PHPVER%

:: Check extensions
echo  Checking extensions...
php -m | findstr /i "pdo_sqlite pdo_mysql" >nul 2>&1
if %errorlevel% neq 0 (
    echo  X No database driver found. Enable php_pdo_sqlite or php_pdo_mysql in php.ini
    pause
    exit /b 1
)
echo    Database driver OK

php -m | findstr /i "mbstring openssl tokenizer xml ctype json curl zip bcmath intl gd fileinfo" >nul 2>&1

:: 2. Composer install
echo  Installing Composer dependencies...
composer install --no-dev --optimize-autoloader --quiet
if %errorlevel% neq 0 (
    echo  X Composer install failed. Install Composer from https://getcomposer.org
    pause
    exit /b 1
)
echo    Dependencies installed

:: 3. Create .env
if not exist .env (
    copy .env.example .env >nul
    echo    .env created from .env.example
) else (
    echo    .env already exists
)

:: 4. Generate APP_KEY
echo  Generating APP_KEY...
php artisan key:generate --force --quiet
echo    APP_KEY generated

:: 5. Database setup (SQLite default)
echo  Setting up database...
if not exist database\database.sqlite (
    type nul > database\database.sqlite
    echo    Created SQLite database
)
php artisan migrate --force --quiet
echo    Migrations applied

:: 6. Seed demo data
echo  Seeding demo data...
php artisan db:seed --force --quiet 2>nul
echo    Demo data seeded

:: 7. npm install + build
echo  Installing frontend dependencies...
call npm install --silent
echo    Frontend dependencies installed

echo  Building frontend...
call npm run build --silent
echo    Frontend built

:: 8. Done
echo.
echo  ═══════════════════════════════════════════
echo   Setup complete!
echo  ═══════════════════════════════════════════
echo.
echo   Start the app:
echo     php artisan serve
echo.
echo   Open in browser:
echo     http://localhost:8000
echo.
echo   Demo login:
echo     Email:    admin@demo.com
echo     Password: password
echo.
echo   Useful commands:
echo     php artisan serve          Development server
echo     php artisan migrate:fresh  Reset database
echo     php artisan migrate:fresh --seed  Reset + re-seed
echo.
pause
