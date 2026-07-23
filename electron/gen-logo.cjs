const sharp = require('sharp');
const path = require('path');

const SIZE = 512;
const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
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
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect x="16" y="16" width="${SIZE - 32}" height="${SIZE - 32}" rx="96" ry="96" fill="url(#bg)" filter="url(#shadow)"/>
  <rect x="16" y="16" width="${SIZE - 32}" height="${SIZE / 2}" rx="96" ry="96" fill="#ffffff" opacity="0.03"/>
  <g filter="url(#shadow)">
    <rect x="112" y="300" width="56" height="104" rx="12" fill="url(#accent)" opacity="0.5"/>
    <rect x="200" y="248" width="56" height="156" rx="12" fill="url(#accent)" opacity="0.75"/>
    <rect x="288" y="192" width="56" height="212" rx="12" fill="url(#accent)"/>
  </g>
  <text x="256" y="164" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="104" font-weight="800"
        fill="#f1f5f9" text-anchor="middle" dominant-baseline="middle" letter-spacing="-4">I</text>
  <rect x="96" y="428" width="320" height="4" rx="2" fill="#34d399" opacity="0.3"/>
</svg>`;

sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, '..', 'public', 'logo.png')).then(() => {
  console.log('Logo PNG generated: public/logo.png');
});
