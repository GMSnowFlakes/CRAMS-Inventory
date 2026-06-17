# CRAMS — Inventory Management System

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/GMSnowFlakes/CRAMS-Inventory?quickstart=1)

> **Live demo** — click the button above. The environment builds automatically (~3 min) and opens CRAMS in your browser. Login: `admin@demo.com` / `password`

**Complete multi-branch inventory for small and medium businesses**

CRAMS is a full-featured inventory and business operations platform built on Laravel 13 + React. It covers everything from purchase orders and point-of-sale to forecasting, compliance, and franchise management — all in a single, self-hosted application.

---

## Features

| Module | What it does |
|--------|-------------|
| Inventory | Stock-in, stock-out, adjustments, multi-location stock levels |
| Products | Catalog management, categories, barcode assignment, bulk import |
| Sales | Order management, payment recording, customer statements |
| Point of Sale | Fast POS interface with barcode lookup |
| Purchase Orders | Supplier ordering, receive stock, payment tracking |
| Stock Counts | Scheduled counts, variance detection, commit workflow |
| Transfer Orders | Inter-branch stock transfers with dispatch/receive flow |
| Customers | Customer records, credit terms, statement reporting |
| Suppliers | Supplier directory, supplier portal with tokenized access |
| Expenses | Expense tracking by category, bulk import |
| Forecasting | Demand forecasting based on sales history |
| Reports | 20+ reports: inventory summary, profit/loss, top products, dead stock, cash flow, exports |
| DNA Score | Business health scoring across key inventory metrics |
| Health Score | Composite operational health indicator |
| Simulator | What-if scenario modelling for purchasing decisions |
| Approvals | Multi-step approval workflows for sensitive actions |
| Compliance | Document management with expiry alerts |
| Recalls | Product recall tracking and resolution |
| Franchise | Multi-franchise summary and branch linking |
| Audit Logs | Full activity trail across all modules |
| Users & Branches | Role-based access, multi-branch support |
| Industry Kits | Pre-configured setups for common business types |
| Settings | Branding, logo upload, system configuration |

---

## Requirements

| Dependency | Minimum version |
|------------|----------------|
| PHP | 8.3 |
| PHP Extensions | mbstring, xml, curl, zip, bcmath, intl, gd, pdo_mysql |
| Composer | 2.x |
| Node.js | 18.x |
| Database | SQLite (dev) / MySQL 8+ / PostgreSQL 15+ (production) |

---

## Quick Install

```bash
# 1. Clone the repository
git clone https://github.com/your-github-org/crams-inventory.git
cd crams-inventory

# 2. Install PHP dependencies
composer install --no-dev --optimize-autoloader

# 3. Install and build frontend assets
npm install && npm run build

# 4. Configure environment
cp .env.example .env
php artisan key:generate
# Edit .env — set DB_*, APP_URL, and mail settings

# 5. Run migrations and seed defaults
php artisan migrate --seed
php artisan storage:link
```

Then start the development server:

```bash
php artisan serve
```

The app will be available at `http://localhost:8000`. Default admin credentials are set during the seeder — check `database/seeders/` for details.

---

## System Updates

CRAMS includes a built-in one-click updater. Once installed, go to **Settings → System Updates** (or navigate to `/updates`) in the admin panel.

- The app checks GitHub Releases for the latest version automatically
- Shows the version number, release date, and full changelog
- One click downloads, extracts, and applies the update — including running any new migrations
- No SSH or technical knowledge required for buyers

**Required PHP extension:** `php-zip` (ZipArchive) must be enabled on the server for updates to work. This is included in most shared hosting PHP packages and all standard VPS setups.

---

## Screenshots

> Screenshots coming soon.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 13 (PHP 8.3) |
| Frontend | React 18 + Vite |
| API | Laravel Sanctum (SPA token auth) |
| Database | SQLite / MySQL / PostgreSQL |
| Queue | Database (upgradeable to Redis) |
| Mail | SMTP (optional, disable with `MAIL_ENABLED=false`) |
| Storage | Local disk / AWS S3 |

---

## License

Extended Commercial License. See `LICENSE` file for terms.
