#!/usr/bin/env bash
# ============================================================
#  CRAMS Inventory — Linux Installer
#  Supports: Ubuntu 20+, Debian 11+, CentOS 8+, RHEL 8+
# ============================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✓${RESET} $1"; }
info() { echo -e "  ${CYAN}→${RESET} $1"; }
warn() { echo -e "  ${YELLOW}!${RESET} $1"; }
fail() { echo -e "  ${RED}✗${RESET} $1"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}[$1]${RESET} ${BOLD}$2${RESET}\n$(printf '━%.0s' {1..50})"; }

clear
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║        CRAMS Inventory Platform              ║"
echo "  ║              Linux Installer                 ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${RESET}"
echo "  This installer will set up CRAMS on your server."
echo "  Estimated time: 2–5 minutes."
echo ""
read -rp "  Press ENTER to begin, or Ctrl+C to cancel... "

# ── Root check ────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    fail "Please run as root: sudo bash install.sh"
fi

# ── Detect distro ─────────────────────────────────────────
step "1/7" "Detecting system"

if   [ -f /etc/debian_version ]; then DISTRO="debian"
elif [ -f /etc/redhat-release  ]; then DISTRO="rhel"
else fail "Unsupported Linux distribution. Requires Ubuntu/Debian or CentOS/RHEL."; fi

ok "Detected: $DISTRO-based system"

# ── Install PHP ───────────────────────────────────────────
step "2/7" "Installing PHP 8.3"

PHP_EXTENSIONS="php8.3 php8.3-cli php8.3-fpm php8.3-sqlite3 php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-gd php8.3-intl php8.3-tokenizer"

if command -v php &>/dev/null && php -r "exit(version_compare(PHP_VERSION,'8.2','>=') ? 0 : 1);" 2>/dev/null; then
    ok "PHP $(php -r 'echo PHP_VERSION;') already installed"
else
    info "Installing PHP 8.3..."
    if [ "$DISTRO" = "debian" ]; then
        apt-get update -qq
        apt-get install -y -qq software-properties-common ca-certificates apt-transport-https
        add-apt-repository -y ppa:ondrej/php 2>/dev/null || true
        apt-get update -qq
        apt-get install -y -qq $PHP_EXTENSIONS
    else
        dnf install -y epel-release
        dnf install -y https://rpms.remirepo.net/enterprise/remi-release-$(rpm -E %rhel).rpm
        dnf module enable -y php:remi-8.3
        dnf install -y php php-cli php-fpm php-sqlite3 php-mbstring php-xml php-curl php-zip php-bcmath php-gd
    fi
    ok "PHP $(php -r 'echo PHP_VERSION;') installed"
fi

# ── Install Nginx ─────────────────────────────────────────
step "3/7" "Installing web server"

if ! command -v nginx &>/dev/null; then
    info "Installing Nginx..."
    [ "$DISTRO" = "debian" ] && apt-get install -y -qq nginx || dnf install -y nginx
fi
ok "Nginx ready"

# ── Choose install directory ──────────────────────────────
step "4/7" "Installation location"

DEFAULT_DIR="/var/www/crams"
read -rp "  Install directory [${DEFAULT_DIR}]: " INSTALL_DIR
INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_DIR}"
mkdir -p "$INSTALL_DIR"
ok "Will install to: $INSTALL_DIR"

# ── Extract app ───────────────────────────────────────────
step "5/7" "Extracting application"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ZIP="$SCRIPT_DIR/crams-app.zip"

if [ ! -f "$APP_ZIP" ]; then
    fail "crams-app.zip not found next to installer. Re-download the installer package."
fi

info "Extracting files..."
unzip -q -o "$APP_ZIP" -d "$INSTALL_DIR"
chown -R www-data:www-data "$INSTALL_DIR" 2>/dev/null || chown -R nginx:nginx "$INSTALL_DIR"
ok "Files extracted"

# ── Configure app ─────────────────────────────────────────
APP_KEY=$(php -r "echo 'base64:'.base64_encode(random_bytes(32));")
DB_PATH="$INSTALL_DIR/database/database.sqlite"
touch "$DB_PATH"

cat > "$INSTALL_DIR/.env" <<EOF
APP_NAME=CRAMS
APP_ENV=production
APP_KEY=$APP_KEY
APP_DEBUG=false
APP_URL=http://localhost

DB_CONNECTION=sqlite
DB_DATABASE=$DB_PATH

CACHE_STORE=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
LOG_CHANNEL=single
LOG_LEVEL=error
EOF

ok ".env configured (SQLite)"

# ── Run migrations ────────────────────────────────────────
info "Running database migrations..."
php "$INSTALL_DIR/artisan" migrate --force --no-interaction
ok "Database ready"

# ── Company & admin setup ─────────────────────────────────
step "6/7" "Create your account"

echo ""
read -rp "  Company name:     " COMPANY
read -rp "  Your full name:   " ADMIN_NAME
read -rp "  Admin email:      " ADMIN_EMAIL
read -rsp "  Admin password:   " ADMIN_PASS; echo ""
read -rsp "  Confirm password: " ADMIN_PASS2; echo ""

if [ "$ADMIN_PASS" != "$ADMIN_PASS2" ]; then
    fail "Passwords do not match."
fi

php "$INSTALL_DIR/artisan" crams:setup \
    --company="$COMPANY" \
    --name="$ADMIN_NAME" \
    --email="$ADMIN_EMAIL" \
    --password="$ADMIN_PASS"

php "$INSTALL_DIR/artisan" storage:link --force

# ── Nginx config ──────────────────────────────────────────
step "7/7" "Configuring web server"

read -rp "  Port to run CRAMS on [80]: " PORT
PORT="${PORT:-80}"

cat > /etc/nginx/sites-available/crams <<EOF
server {
    listen $PORT;
    server_name _;
    root $INSTALL_DIR/public;
    index index.php;
    client_max_body_size 10M;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* { deny all; }
}
EOF

ln -sf /etc/nginx/sites-available/crams /etc/nginx/sites-enabled/crams 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

systemctl enable php8.3-fpm nginx
systemctl restart php8.3-fpm nginx

ok "Nginx configured on port $PORT"

# ── Done ──────────────────────────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${BOLD}${GREEN}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║         Installation Complete! ✓             ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  Open your browser and go to:"
echo -e "  ${BOLD}${CYAN}http://${SERVER_IP}:${PORT}${RESET}"
echo ""
echo "  Login with: $ADMIN_EMAIL"
echo ""
