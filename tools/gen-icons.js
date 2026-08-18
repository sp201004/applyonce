const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '../web/node_modules/sharp'));

const root = path.resolve(__dirname, '..');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="ApplyOnce logo">
  <rect width="512" height="512" rx="112" fill="#2563eb"/>
  <path d="M146 94h156l64 64v260H146z" fill="#fff"/>
  <path d="M302 94v70h64" fill="#dbeafe"/>
  <path d="M188 294l46 46 94-108" fill="none" stroke="#2563eb" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M194 210h72" stroke="#93c5fd" stroke-width="22" stroke-linecap="round"/>
</svg>`;

const outputs = [
  ['assets/applyonce_logo.svg', null],
  ['web/public/applyonce_logo.svg', null],
  ['assets/applyonce_logo.png', 512],
  ['options/assets/applyonce_logo.png', 256],
  ['sidepanel/assets/applyonce_logo.png', 256],
  ['web/public/applyonce_logo.png', 512],
  ['assets/icon16.png', 16], ['assets/icon32.png', 32],
  ['assets/icon48.png', 48], ['assets/icon128.png', 128],
  ['web/public/favicon_io/favicon-16x16.png', 16],
  ['web/public/favicon_io/favicon-32x32.png', 32],
  ['web/public/favicon_io/apple-touch-icon.png', 180],
  ['web/public/favicon_io/android-chrome-192x192.png', 192],
  ['web/public/favicon_io/android-chrome-512x512.png', 512]
];

(async () => {
  for (const [relative, size] of outputs) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (size === null) fs.writeFileSync(file, svg);
    else await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
    console.log(`Generated ${relative}`);
  }
})().catch(error => { console.error(error); process.exit(1); });
