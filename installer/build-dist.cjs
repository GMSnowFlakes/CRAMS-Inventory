/**
 * CRAMS Distribution Builder
 * --------------------------
 * Produces:
 *   dist/
 *   ├── crams-app.zip      ← pre-built app bundle (no Node/Composer needed by client)
 *   ├── CRAMS-Setup.exe    ← Windows installer
 *   └── install.sh         ← Linux installer
 *
 * Usage:  node installer/build-dist.cjs
 * Prereq: vendor/ must already exist (composer install --no-dev was run)
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const DIST    = path.join(ROOT, 'dist');
const STAGING = path.join(ROOT, '.staging-dist');

// Directories / files to exclude from the app bundle
const EXCLUDE_NAMES = new Set([
    '.git',
    '.env',
    '.env.local',
    '.env.testing',
    'node_modules',
    'dist',
    'installer',
    'scripts',
    'tests',
    'phpunit.xml',
    'phpunit.xml.dist',
    '.phpunit.result.cache',
    '.DS_Store',
    'Thumbs.db',
    '.staging-dist',
]);

// ── Helpers ───────────────────────────────────────────────
const ok   = m => console.log(`  ✓ ${m}`);
const info = m => console.log(`  → ${m}`);
const warn = m => console.log(`  ! ${m}`);

function copyDir(src, dest, depth = 0) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        if (EXCLUDE_NAMES.has(entry.name)) continue;
        // Skip storage/framework/{cache,sessions,views} contents but keep dirs
        const srcPath  = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            // Keep storage dirs but empty out runtime-generated subdirs
            const skipContent = ['cache','sessions','views'].includes(entry.name) &&
                src.replace(/\\/g,'/').includes('storage/framework');
            if (!skipContent) copyDir(srcPath, destPath, depth + 1);
            else fs.writeFileSync(path.join(destPath, '.gitkeep'), '');
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function rmDir(p) {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

// ── Step 1: Build frontend ────────────────────────────────
console.log('\n CRAMS Distribution Builder');
console.log(' ══════════════════════════\n');

info('Building frontend assets...');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
ok('Frontend built\n');

// ── Step 2: Stage app files ───────────────────────────────
info('Staging app files...');
rmDir(STAGING);
fs.mkdirSync(STAGING, { recursive: true });
copyDir(ROOT, STAGING);

// Ensure empty runtime dirs exist (Laravel needs these)
for (const d of [
    'storage/app/public/branding',
    'storage/framework/cache/data',
    'storage/framework/sessions',
    'storage/framework/views',
    'storage/logs',
    'database',
    'bootstrap/cache',
]) {
    fs.mkdirSync(path.join(STAGING, d), { recursive: true });
    const keep = path.join(STAGING, d, '.gitkeep');
    if (!fs.existsSync(keep)) fs.writeFileSync(keep, '');
}

// Touch sqlite file placeholder
fs.writeFileSync(path.join(STAGING, 'database', '.gitkeep'), '');
ok('Files staged\n');

// ── Step 3: Zip staging dir ───────────────────────────────
info('Creating crams-app.zip...');
fs.mkdirSync(DIST, { recursive: true });
const appZip = path.join(DIST, 'crams-app.zip');
rmDir(appZip);

execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${STAGING}\\*' -DestinationPath '${appZip}' -CompressionLevel Optimal"`,
    { stdio: 'ignore' }
);
rmDir(STAGING);

const sizeMB = (fs.statSync(appZip).size / 1024 / 1024).toFixed(1);
ok(`crams-app.zip created (${sizeMB} MB)\n`);

// ── Step 4: Copy Linux installer ─────────────────────────
info('Copying Linux installer...');
const linuxSh = path.join(__dirname, 'linux', 'install.sh');
fs.copyFileSync(linuxSh, path.join(DIST, 'install.sh'));
ok('install.sh copied\n');

// ── Step 5: Build Windows .exe ───────────────────────────
info('Building Windows installer .exe...');
try {
    execSync(`node "${path.join(__dirname, 'windows', 'build.cjs')}"`, {
        cwd: path.join(__dirname, 'windows'),
        stdio: 'inherit',
    });
    const exeSrc = path.join(__dirname, 'windows', 'dist', 'CRAMS-Setup.exe');
    if (fs.existsSync(exeSrc)) {
        fs.copyFileSync(exeSrc, path.join(DIST, 'CRAMS-Setup.exe'));
        ok('CRAMS-Setup.exe copied\n');
    }
} catch {
    warn('Windows .exe build skipped — install pkg first: npm install -g pkg\n');
}

// ── Summary ───────────────────────────────────────────────
console.log(' Distribution ready in: dist/');
console.log(' ══════════════════════\n');
console.log('  dist/crams-app.zip      ← required by both installers');
console.log('  dist/CRAMS-Setup.exe    ← Windows: distribute with crams-app.zip');
console.log('  dist/install.sh         ← Linux: distribute with crams-app.zip\n');
