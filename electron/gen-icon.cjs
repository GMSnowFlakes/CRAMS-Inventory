// Generates a premium 256x256 ICO for InventoryOS using sharp + to-ico
// Design: Dark navy rounded square with a bold geometric "I" mark + inventory bars
const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const SIZE = 256;

// Build SVG — premium dark navy + emerald gradient with a clean "I" + stacked bars
const svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Rounded square background -->
  <rect x="8" y="8" width="${SIZE - 16}" height="${SIZE - 16}" rx="48" ry="48" fill="url(#bg)" filter="url(#shadow)"/>

  <!-- Subtle top highlight -->
  <rect x="8" y="8" width="${SIZE - 16}" height="${SIZE / 2}" rx="48" ry="48" fill="#ffffff" opacity="0.03"/>

  <!-- Inventory bars (3 stacked, increasing height) -->
  <g filter="url(#shadow)">
    <rect x="56" y="150" width="28" height="52" rx="6" fill="url(#accent)" opacity="0.5"/>
    <rect x="100" y="124" width="28" height="78" rx="6" fill="url(#accent)" opacity="0.75"/>
    <rect x="144" y="96" width="28" height="106" rx="6" fill="url(#accent)"/>
  </g>

  <!-- "I" letter mark -->
  <text x="128" y="82" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="52" font-weight="800"
        fill="#f1f5f9" text-anchor="middle" dominant-baseline="middle" letter-spacing="-2">I</text>

  <!-- Bottom shine line -->
  <rect x="48" y="214" width="160" height="2" rx="1" fill="#34d399" opacity="0.3"/>
</svg>
`;

(async () => {
  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png()
    .toBuffer();

  // Generate multi-size ICO (256, 128, 64, 48, 32, 16)
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngs = [];
  for (const s of sizes) {
    const buf = await sharp(pngBuffer).resize(s, s).png().toBuffer();
    pngs.push(buf);
  }

  const ico = await toIco(pngs);
  const outPath = path.join(__dirname, 'icon.ico');
  fs.writeFileSync(outPath, ico);
  console.log(`Icon generated: ${outPath} (${ico.length} bytes)`);
})();
