const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');

let mainWindow = null;
let phpProcess = null;
let serverPort = null;
let isQuitting = false;

const isDev = !app.isPackaged;
const isWindows = process.platform === 'win32';

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
function getLogPath() {
  return path.join(app.getPath('userData'), 'logs', 'main.log');
}

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(getLogPath()), { recursive: true });
    fs.appendFileSync(getLogPath(), line + '\n');
  } catch (_) {
    // ignore log write failures
  }
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------
function findPhpBinary() {
  if (isDev) {
    try {
      execSync('php -v', { stdio: 'pipe' });
      log('PHP binary: php (system PATH)');
      return 'php';
    } catch (_) {
      throw new Error('PHP not found in PATH. Install PHP or add it to PATH for development mode.');
    }
  }
  const phpExe = path.join(process.resourcesPath, 'php', 'php.exe');
  if (!fs.existsSync(phpExe)) {
    throw new Error(`Bundled PHP not found at: ${phpExe}`);
  }
  log(`PHP binary: ${phpExe}`);
  return phpExe;
}

function getAppDir() {
  const dir = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath, 'app');
  return dir;
}

function getIconPath() {
  if (isDev) return path.join(__dirname, 'icon.ico');
  return path.join(process.resourcesPath, 'icon.ico');
}

function getDbPath() {
  const dbDir = path.join(app.getPath('userData'), 'database');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  return path.join(dbDir, 'database.sqlite');
}

function getDbPathForward() {
  // Laravel's dotenv parser cannot handle backslashes inside quoted values.
  return getDbPath().replace(/\\/g, '/');
}

function getInitMarker() {
  return path.join(app.getPath('userData'), '.initialized');
}

// ---------------------------------------------------------------------------
// .env file management
// ---------------------------------------------------------------------------
function updateEnvFile(appDir, port) {
  const envPath = path.join(appDir, '.env');
  const dbPathForward = getDbPathForward();
  const appUrl = `http://127.0.0.1:${port}`;

  const setVar = (content, name, value) => {
    const regex = new RegExp(`^${name}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${name}=${value}`);
    }
    return content + `${name}=${value}\n`;
  };

  try {
    if (!fs.existsSync(envPath)) {
      log('.env not found, creating minimal .env');
      const content =
        `APP_NAME=InventoryOS\n` +
        `APP_ENV=local\n` +
        `APP_DEBUG=false\n` +
        `APP_URL=${appUrl}\n` +
        `ASSET_URL=${appUrl}\n` +
        `DB_CONNECTION=sqlite\n` +
        `DB_DATABASE="${dbPathForward}"\n` +
        `CACHE_STORE=file\n` +
        `SESSION_DRIVER=file\n` +
        `QUEUE_CONNECTION=sync\n` +
        `LOG_CHANNEL=single\n`;
      fs.writeFileSync(envPath, content);
      log('.env created.');
      return;
    }
    let content = fs.readFileSync(envPath, 'utf8');
    content = setVar(content, 'DB_CONNECTION', 'sqlite');
    content = setVar(content, 'DB_DATABASE', `"${dbPathForward}"`);
    content = setVar(content, 'APP_URL', appUrl);
    content = setVar(content, 'ASSET_URL', appUrl);
    content = setVar(content, 'APP_DEBUG', 'false');
    fs.writeFileSync(envPath, content);
    log('.env updated (DB_DATABASE, DB_CONNECTION, APP_URL).');
  } catch (e) {
    log(`Warning: could not write .env (${e.message}). Relying on environment variables passed to PHP.`);
  }
}

// ---------------------------------------------------------------------------
// Artisan runner
// ---------------------------------------------------------------------------
function runArtisan(phpBin, appDir, command) {
  log(`Running artisan: ${command}`);
  try {
    const output = execSync(`"${phpBin}" artisan ${command}`, {
      cwd: appDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: getDbPathForward(),
      },
      timeout: 120000,
    });
    const text = output.toString().trim();
    if (text) log(`artisan ${command}: ${text}`);
    return true;
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString().trim() : '';
    log(`artisan ${command} FAILED: ${e.message}${stderr ? '\n' + stderr : ''}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// First-run database initialization
// ---------------------------------------------------------------------------
function initializeDatabase(phpBin, appDir) {
  const marker = getInitMarker();
  if (fs.existsSync(marker)) {
    log('Database already initialized (marker found). Skipping init.');
    return;
  }

  log('First run: initializing database...');
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
    log(`Created empty SQLite file: ${dbPath}`);
  }

  if (!runArtisan(phpBin, appDir, 'migrate --force')) {
    throw new Error('Migration failed. Check the log file for details.');
  }
  log('Migrations complete.');

  if (!runArtisan(phpBin, appDir, 'db:seed --force')) {
    log('Warning: db:seed failed (continuing — data may already exist).');
  } else {
    log('Seeding complete.');
  }

  fs.writeFileSync(marker, new Date().toISOString());
  log('Database initialized successfully.');
}

// ---------------------------------------------------------------------------
// Free port discovery
// ---------------------------------------------------------------------------
function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

// ---------------------------------------------------------------------------
// Wait for PHP server
// ---------------------------------------------------------------------------
function waitForServer(port, maxAttempts = 120) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (phpProcess === null && !isDev) {
        reject(new Error('PHP process exited before server became ready. Check logs for PHP errors.'));
        return;
      }
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        res.resume();
        if (res.statusCode < 500) {
          log(`Server responded (status ${res.statusCode}, attempt ${attempts}/${maxAttempts}).`);
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          reject(new Error(`Server returned status ${res.statusCode} after ${attempts} attempts.`));
        }
      });
      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          reject(new Error(`Server not responding after ${attempts} attempts (60s). PHP may have failed to start.`));
        }
      });
      req.setTimeout(3000, () => {
        req.destroy();
        if (attempts < maxAttempts) {
          setTimeout(check, 500);
        } else {
          reject(new Error('Server request timeout.'));
        }
      });
    };
    check();
  });
}

// ---------------------------------------------------------------------------
// Ensure Laravel storage directories exist (electron-builder does not preserve
// empty directories or .gitignore-only directories, so we recreate them here).
// ---------------------------------------------------------------------------
function ensureStorageDirs(appDir) {
  const dirs = [
    'storage/app/public',
    'storage/app/private/public/branding',
    'storage/framework/cache/data',
    'storage/framework/sessions',
    'storage/framework/views',
    'storage/framework/testing',
    'storage/logs',
    'bootstrap/cache',
  ];
  for (const dir of dirs) {
    const full = path.join(appDir, dir);
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true });
    }
  }
  log('Ensured Laravel storage/bootstrap directories exist.');
}

// ---------------------------------------------------------------------------
// Start PHP server
// ---------------------------------------------------------------------------
async function startPhpServer() {
  const phpBin = findPhpBinary();
  const appDir = getAppDir();
  log(`App directory: ${appDir}`);
  log(`Is packaged: ${!isDev}`);
  log(`Is Windows: ${isWindows}`);
  log(`userData: ${app.getPath('userData')}`);

  if (!fs.existsSync(path.join(appDir, 'artisan'))) {
    throw new Error(`artisan not found in app directory: ${appDir}`);
  }

  ensureStorageDirs(appDir);

  if (isWindows && !isDev) {
    try {
      execSync('taskkill /f /im php.exe 2>nul', { stdio: 'ignore' });
      log('Killed any existing PHP processes.');
    } catch (_) {
      // no existing PHP processes — fine
    }
  }

  serverPort = await getFreePort();
  log(`Using port: ${serverPort}`);

  initializeDatabase(phpBin, appDir);
  updateEnvFile(appDir, serverPort);

  const dbPathForward = getDbPathForward();
  log(`DB path: ${dbPathForward}`);
  log(`Starting PHP server on 127.0.0.1:${serverPort}...`);

  phpProcess = spawn(phpBin, ['artisan', 'serve', `--port=${serverPort}`, '--host=127.0.0.1'], {
    cwd: appDir,
    env: {
      ...process.env,
      DB_CONNECTION: 'sqlite',
      DB_DATABASE: dbPathForward,
      APP_URL: `http://127.0.0.1:${serverPort}`,
    },
    windowsHide: true,
  });

  phpProcess.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) log(`PHP stdout: ${text}`);
  });
  phpProcess.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) log(`PHP stderr: ${text}`);
  });
  phpProcess.on('exit', (code, signal) => {
    log(`PHP process exited: code=${code} signal=${signal}`);
    phpProcess = null;
  });
  phpProcess.on('error', (err) => {
    log(`PHP spawn error: ${err.message}`);
  });

  await waitForServer(serverPort);
  log('PHP server is ready!');
}

// ---------------------------------------------------------------------------
// Browser window
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'InventoryOS',
    icon: getIconPath(),
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

  mainWindow.once('ready-to-show', () => {
    log('Window ready-to-show.');
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log(`did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
    if (isQuitting) return;
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && serverPort) {
        log('Retrying load after did-fail-load...');
        mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
      }
    }, 2000);
  });

  // Block external links — only allow 127.0.0.1 / localhost
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\/(127\.0\.0\.1|localhost)([:/].*)?$/.test(url)) {
      return { action: 'allow' };
    }
    log(`Blocked window open: ${url}`);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)([:/].*)?$/.test(url)) {
      log(`Blocked navigation to: ${url}`);
      event.preventDefault();
    }
  });

  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
function killPhp() {
  if (!phpProcess) return;
  if (isWindows) {
    try {
      execSync(`taskkill /pid ${phpProcess.pid} /f /t`, { stdio: 'ignore' });
      log(`Killed PHP process tree (pid ${phpProcess.pid}).`);
    } catch (e) {
      log(`taskkill failed: ${e.message}`);
    }
  } else {
    try {
      phpProcess.kill('SIGTERM');
      log('Sent SIGTERM to PHP process.');
    } catch (e) {
      log(`kill failed: ${e.message}`);
    }
  }
  phpProcess = null;
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  log('=== InventoryOS starting ===');
  log(`Electron ${process.versions.electron}, Node ${process.versions.node}, Platform ${process.platform}`);
  try {
    await startPhpServer();
    createWindow();
    // Auto-update checker
    if (app.isPackaged) {
      try {
        const { startUpdateChecker } = require('./updater.cjs');
        const { BrowserWindow: bw } = require('electron');
        const wins = bw.getAllWindows();
        if (wins.length) startUpdateChecker(wins[0]);
      } catch (e) { log(`Update checker failed: ${e.message}`); }
    }
  } catch (err) {
    log(`FATAL: ${err.stack || err.message}`);
    dialog.showErrorBox(
      'InventoryOS Startup Error',
      `${err.message}\n\nCheck the log file:\n${getLogPath()}`
    );
    killPhp();
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  log('window-all-closed.');
  isQuitting = true;
  killPhp();
  app.quit();
});

app.on('before-quit', () => {
  log('before-quit.');
  isQuitting = true;
  killPhp();
});

// Prevent unwanted navigation away from the local server on the root window
app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault());
});
