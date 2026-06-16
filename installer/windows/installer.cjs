/**
 * CRAMS Inventory — Windows Installer
 * Compile to .exe: node build.cjs
 */

const readline = require('readline');
const { execSync, spawnSync } = require('child_process');
const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const crypto = require('crypto');

// ── Colours (Windows 10+ supports ANSI) ──────────────────
const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    green:  '\x1b[32m',
    red:    '\x1b[31m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
};

const ok   = msg => console.log(`  ${C.green}✓${C.reset} ${msg}`);
const info = msg => console.log(`  ${C.cyan}→${C.reset} ${msg}`);
const warn = msg => console.log(`  ${C.yellow}!${C.reset} ${msg}`);
const fail = msg => { console.log(`\n  ${C.red}✗ ERROR:${C.reset} ${msg}\n`); process.exit(1); };
const step = (n, t) => {
    const line = '━'.repeat(50);
    console.log(`\n${C.bold}${C.cyan}[${n}]${C.reset} ${C.bold}${t}${C.reset}\n${line}`);
};

// ── Prompt helper ─────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, hidden = false) => new Promise(resolve => {
    if (hidden) process.stdout.write(`  ${q}`);
    else process.stdout.write(`  ${q}`);
    if (hidden) {
        // Disable echo
        const stdin = process.openStdin();
        process.stdin.setRawMode(true);
        let pass = '';
        process.stdin.on('data', function handler(ch) {
            ch = ch.toString();
            if (ch === '\n' || ch === '\r' || ch === '') {
                process.stdin.setRawMode(false);
                process.stdin.removeListener('data', handler);
                process.stdout.write('\n');
                resolve(pass);
            } else if (ch === '') {
                pass = pass.slice(0, -1);
            } else {
                pass += ch;
                process.stdout.write('*');
            }
        });
    } else {
        rl.question('', resolve);
    }
});

const askDefault = async (q, def) => {
    const ans = await ask(`${q} [${def}]: `);
    return ans.trim() || def;
};

// ── PHP detection & install ───────────────────────────────
const PHP_DIR     = 'C:\\crams-php';
const PHP_EXE     = path.join(PHP_DIR, 'php.exe');
const PHP_VERSION = '8.3.21';
const PHP_URL     = `https://windows.php.net/downloads/releases/php-${PHP_VERSION}-nts-Win32-vs16-x64.zip`;

function findPhp() {
    // Check PATH first
    const r = spawnSync('php', ['-r', 'echo PHP_VERSION;'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout) return 'php';

    // Check bundled location
    if (fs.existsSync(PHP_EXE)) return PHP_EXE;

    // Common locations
    const locs = [
        'C:\\php\\php.exe',
        'C:\\xampp\\php\\php.exe',
        'C:\\laragon\\bin\\php\\php8.3.9-nts-Win32-vs16-x64\\php.exe',
    ];
    for (const loc of locs) {
        if (fs.existsSync(loc)) return loc;
    }
    return null;
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, res => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                file.close();
                fs.unlinkSync(dest);
                return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
            }
            const total = parseInt(res.headers['content-length'] || '0', 10);
            let received = 0;
            res.on('data', chunk => {
                received += chunk.length;
                if (total) {
                    const pct = Math.round(received / total * 100);
                    process.stdout.write(`\r  ${C.cyan}→${C.reset} Downloading... ${pct}%`);
                }
            });
            res.pipe(file);
            file.on('finish', () => { file.close(); process.stdout.write('\n'); resolve(); });
        }).on('error', reject);
    });
}

async function installPhp() {
    info('PHP not found. Downloading PHP 8.3...');
    const zipPath = path.join(os.tmpdir(), 'php.zip');
    await downloadFile(PHP_URL, zipPath);

    info('Extracting PHP...');
    fs.mkdirSync(PHP_DIR, { recursive: true });
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${PHP_DIR}' -Force"`, { stdio: 'ignore' });
    fs.unlinkSync(zipPath);

    // Configure php.ini
    const iniSrc = path.join(PHP_DIR, 'php.ini-production');
    const iniDst = path.join(PHP_DIR, 'php.ini');
    let ini = fs.readFileSync(iniSrc, 'utf8');
    ini = ini
        .replace(';extension=sqlite3',      'extension=sqlite3')
        .replace(';extension=pdo_sqlite',   'extension=pdo_sqlite')
        .replace(';extension=mbstring',     'extension=mbstring')
        .replace(';extension=openssl',      'extension=openssl')
        .replace(';extension=curl',         'extension=curl')
        .replace(';extension=fileinfo',     'extension=fileinfo')
        .replace(';extension=gd',           'extension=gd')
        .replace(';extension_dir = "./"',   `extension_dir = "${PHP_DIR}\\ext"`)
        .replace('upload_max_filesize = 2M','upload_max_filesize = 10M')
        .replace('post_max_size = 8M',      'post_max_size = 10M');
    fs.writeFileSync(iniDst, ini);
    ok('PHP 8.3 installed to C:\\crams-php');
    return PHP_EXE;
}

function php(phpExe, args, cwd) {
    const r = spawnSync(phpExe, args, { cwd, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
    if (r.status !== 0) fail(r.stderr || r.stdout || 'PHP command failed');
    return r.stdout;
}

// ── Main installer ────────────────────────────────────────
async function main() {
    // Enable ANSI on Windows
    try { execSync('reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f', { stdio: 'ignore' }); } catch {}

    console.clear();
    console.log(`${C.bold}`);
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║        CRAMS Inventory Platform              ║');
    console.log('  ║            Windows Installer                 ║');
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log(`${C.reset}`);
    console.log('  Welcome! This wizard will install CRAMS on your computer.');
    console.log('  Estimated time: 2–4 minutes.\n');
    await ask('Press ENTER to begin or close this window to cancel... ');

    // ── Step 1: System check ──────────────────────────────
    step('1/6', 'System Check');

    if (os.platform() !== 'win32') fail('This installer is for Windows only.');
    ok('Windows detected');

    let phpExe = findPhp();
    if (!phpExe) {
        phpExe = await installPhp();
    } else {
        const ver = spawnSync(phpExe, ['-r', 'echo PHP_VERSION;'], { encoding: 'utf8' }).stdout;
        ok(`PHP ${ver} found`);
    }

    // ── Step 2: Install location ──────────────────────────
    step('2/6', 'Installation Folder');

    const defaultDir = 'C:\\CRAMS';
    let installDir = await askDefault('Where should CRAMS be installed?', defaultDir);
    installDir = installDir.replace(/['"]/g, '').trim();

    if (fs.existsSync(installDir) && fs.readdirSync(installDir).length > 0) {
        warn(`Folder exists and is not empty: ${installDir}`);
        const overwrite = await ask('Continue anyway? (yes/no): ');
        if (!overwrite.toLowerCase().startsWith('y')) fail('Installation cancelled.');
    }

    fs.mkdirSync(installDir, { recursive: true });
    ok(`Installing to: ${installDir}`);

    // ── Step 3: Extract app ───────────────────────────────
    step('3/6', 'Extracting Application');

    const scriptDir = path.dirname(process.execPath || __filename);
    const appZip = path.join(scriptDir, 'crams-app.zip');

    if (!fs.existsSync(appZip)) {
        fail('crams-app.zip not found next to the installer. Please re-download the installer package.');
    }

    info('Extracting files...');
    execSync(`powershell -Command "Expand-Archive -Path '${appZip}' -DestinationPath '${installDir}' -Force"`, { stdio: 'ignore' });
    ok('Application files extracted');

    // Configure .env
    const appKey = 'base64:' + crypto.randomBytes(32).toString('base64');
    const dbPath = path.join(installDir, 'database', 'database.sqlite').replace(/\\/g, '/');
    const dbDir  = path.join(installDir, 'database');

    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(path.join(dbDir, 'database.sqlite'), '');

    const env = [
        'APP_NAME=CRAMS',
        'APP_ENV=production',
        `APP_KEY=${appKey}`,
        'APP_DEBUG=false',
        'APP_URL=http://localhost:8080',
        '',
        'DB_CONNECTION=sqlite',
        `DB_DATABASE=${dbPath}`,
        '',
        'CACHE_STORE=file',
        'SESSION_DRIVER=file',
        'QUEUE_CONNECTION=sync',
        'LOG_CHANNEL=single',
        'LOG_LEVEL=error',
    ].join('\n');

    fs.writeFileSync(path.join(installDir, '.env'), env);
    ok('.env configured');

    // Run migrations
    info('Setting up database...');
    php(phpExe, ['artisan', 'migrate', '--force', '--no-interaction'], installDir);
    ok('Database ready');

    // Storage link
    php(phpExe, ['artisan', 'storage:link', '--force'], installDir);
    ok('Storage configured');

    // ── Step 4: Account setup ─────────────────────────────
    step('4/6', 'Company & Admin Account');
    console.log('');

    const company   = await ask('Company name:       ');
    const adminName = await ask('Your full name:     ');
    const adminEmail= await ask('Admin email:        ');
    const adminPass = await ask('Admin password:     ', true);
    const adminPass2= await ask('Confirm password:   ', true);

    if (adminPass !== adminPass2) fail('Passwords do not match.');

    // ── Step 5: License key ───────────────────────────────
    step('5/6', 'License Activation');
    console.log('');
    const licenseKey = await ask('Paste your license key:\n  ');

    // ── Step 6: Install ───────────────────────────────────
    step('6/6', 'Installing');
    console.log('');

    info('Creating admin account and activating license...');
    php(phpExe, [
        'artisan', 'crams:setup',
        `--company=${company}`,
        `--name=${adminName}`,
        `--email=${adminEmail}`,
        `--password=${adminPass}`,
        `--license=${licenseKey}`,
    ], installDir);
    ok('Admin account created');
    ok('License activated');

    // Create launcher batch file
    const launcherPath = path.join(installDir, 'Start CRAMS.bat');
    const launcherContent = [
        '@echo off',
        `cd /d "${installDir}"`,
        'echo Starting CRAMS...',
        `start "" http://localhost:8080`,
        `"${phpExe}" artisan serve --port=8080 --no-interaction`,
    ].join('\r\n');
    fs.writeFileSync(launcherPath, launcherContent);

    // Create desktop shortcut
    const desktop = path.join(os.homedir(), 'Desktop');
    const shortcutScript = `
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${path.join(desktop, 'Start CRAMS.lnk').replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "${launcherPath.replace(/\\/g, '\\\\')}"
$Shortcut.WorkingDirectory = "${installDir.replace(/\\/g, '\\\\')}"
$Shortcut.Description = "Start CRAMS Inventory"
$Shortcut.Save()
`;
    try {
        execSync(`powershell -Command "${shortcutScript.replace(/\n/g, ' ')}"`, { stdio: 'ignore' });
        ok('Desktop shortcut created');
    } catch {
        warn('Could not create desktop shortcut — use Start CRAMS.bat directly');
    }

    ok(`Launcher saved to: ${launcherPath}`);

    // Done
    rl.close();
    console.log('');
    console.log(`${C.bold}${C.green}`);
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║        Installation Complete! ✓              ║');
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log(`${C.reset}`);
    console.log('  To start CRAMS:');
    console.log(`  ${C.bold}Double-click "Start CRAMS" on your Desktop${C.reset}`);
    console.log('');
    console.log(`  Then open: ${C.cyan}${C.bold}http://localhost:8080${C.reset}`);
    console.log(`  Login with: ${adminEmail}`);
    console.log('');

    // Auto-launch
    const launch = await ask('Start CRAMS now? (yes/no) [yes]: ');
    if (!launch.trim() || launch.toLowerCase().startsWith('y')) {
        execSync(`start "" "${launcherPath}"`, { shell: true, stdio: 'ignore' });
    }

    process.exit(0);
}

main().catch(e => {
    console.error(`\n  ${C.red}Unexpected error:${C.reset}`, e.message);
    process.exit(1);
});
