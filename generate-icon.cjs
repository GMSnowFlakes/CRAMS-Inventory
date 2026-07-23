const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

(async () => {
  // Create a 256x256 icon with InventoryOS branding
  const svg = `
  <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" rx="40" fill="#1e293b"/>
    <rect x="48" y="48" width="160" height="160" rx="20" fill="#0ea5e9"/>
    <text x="128" y="140" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">IOS</text>
    <rect x="48" y="48" width="160" height="160" rx="20" fill="none" stroke="#38bdf8" stroke-width="3"/>
  </svg>`;

  const sizes = [16, 32, 48, 64, 128, 256];
  const pngs = [];

  for (const size of sizes) {
    const png = await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toBuffer();
    pngs.push(png);
  }

  const ico = await toIco(pngs);
  const outPath = path.join(__dirname, 'electron', 'icon.ico');
  fs.writeFileSync(outPath, ico);
  console.log('Icon created:', outPath, `(${(ico.length / 1024).toFixed(1)} KB)`);
})();
