/**
 * Compiles installer.cjs → CRAMS-Setup.exe
 * Run: node build.cjs
 * Requires: npm install -g pkg
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'dist');
fs.mkdirSync(OUT, { recursive: true });

console.log('Building CRAMS-Setup.exe...');

// pkg config is in package.json of this folder
const pkgJson = {
    name: 'crams-installer',
    version: '1.0.0',
    bin: './installer.cjs',
    pkg: {
        targets: ['node18-win-x64'],
        outputPath: OUT,
        assets: [],
    },
};
fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify(pkgJson, null, 2));

try {
    execSync(`npx pkg installer.cjs --targets node18-win-x64 --output "${path.join(OUT, 'CRAMS-Setup.exe')}"`, {
        cwd: __dirname,
        stdio: 'inherit',
    });
    console.log(`\n✓ Built: installer/windows/dist/CRAMS-Setup.exe`);
    console.log('  Copy CRAMS-Setup.exe and crams-app.zip into the same folder for distribution.');
} catch (e) {
    console.error('Build failed. Make sure pkg is installed: npm install -g pkg');
    process.exit(1);
}
