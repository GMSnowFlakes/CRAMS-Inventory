# InventoryOS

**By [CRAMS Creative](https://www.cramscreative.com)**

An inventory management app — products, stock, sales, purchases, transfers, and reports.

---

## How to Install (Step by Step)

You need 2 things installed on your computer first:

### Step 1: Install PHP 8.3 or newer (the engine that runs the app)

**Windows:**
1. Go to **https://windows.php.net/download/**
2. Download **"VS16 x64 Thread Safe"** (the Zip file)
3. Extract the zip to `C:\php`
4. Add `C:\php` to your PATH:
   - Press `Windows + R`, type `sysdm.cpl`, press Enter
   - Click "Advanced" tab → "Environment Variables"
   - Under "System variables", find "Path", click "Edit"
   - Click "New" and type `C:\php`
   - Click OK on everything
5. **Restart your computer**

**Mac:**
```bash
brew install php
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install php php-sqlite3 php-mbstring php-xml php-curl php-zip php-bcmath php-gd php-intl php-fileinfo
```

### Step 2: Install Node.js (builds the frontend)

1. Go to **https://nodejs.org**
2. Click the big green button that says **"LTS"**
3. Run the installer — click "Next" through everything
4. **Restart your computer**

### Step 3: Set up the app

#### Windows

1. **Open Command Prompt**:
   - Press `Windows + R`, type `cmd`, press Enter

2. **Navigate to the InventoryOS folder** (where you unzipped the download):
   ```cmd
   cd "path\to\InventoryOS"
   ```
   > **Tip**: Type `cd ` (with a space), then drag the InventoryOS folder into the Command Prompt window.

3. **Double-click `setup.bat`** — or type this in Command Prompt:
   ```cmd
   setup
   ```

4. **Wait** — you'll see checkmarks as each step completes. This takes 1-2 minutes.

#### Mac / Linux

1. **Open Terminal**

2. **Navigate to the InventoryOS folder**:
   ```bash
   cd "path/to/InventoryOS"
   ```

3. **Run the setup**:
   ```bash
   bash setup.sh
   ```

4. **Wait** — you'll see checkmarks as each step completes.

### Step 4: Start the app

```bash
php artisan serve
```

### Step 5: Open in your browser

Go to: **http://localhost:8000**

### Step 6: Log in

- Email: `admin@demo.com`
- Password: `password`

**You're done!** The app is running on your computer.

---

## Troubleshooting

### "php is not recognized" or "command not found: php"
→ You didn't install PHP, or you didn't restart your computer. Install PHP and restart.

### "Composer is not found"
→ Install Composer from https://getcomposer.org — download and run the installer.

### "node is not recognized"
→ You didn't install Node.js, or you didn't restart. Install from https://nodejs.org and restart.

### "Permission denied" (Mac/Linux)
→ You need administrator rights. Type `sudo bash setup.sh` and enter your password.

### "php_pdo_sqlite not found"
→ You need to enable the SQLite extension in PHP. Edit your `php.ini` file and remove the `;` from:
```ini
extension=pdo_sqlite
```

### Still stuck?
→ Contact us at **www.cramscreative.com** with a screenshot of the error.

---

## What's Included

- **Demo products** with categories and pricing
- **Demo inventory** across multiple branches
- **Demo sales** and purchase orders
- **Demo reports** with charts and data

All demo data is pre-loaded so you can explore the app immediately.

---

## How to Update

The app has a built-in updater:

1. Log in to the app
2. Go to **Settings → System Updates**
3. Click **Check for Updates**
4. Click **Install Update** if one is available

That's it — no technical skills needed.

---

## Commands Reference

| What you want to do | Type this |
|---------------------|-----------|
| Start the app | `php artisan serve` |
| Reset demo data | `php artisan migrate:fresh --seed` |
| Rebuild the frontend | `npm run build` |

---

## License

Extended Commercial License. See `LICENSE` for terms.

---

InventoryOS is a product of [CRAMS Creative](https://www.cramscreative.com).
