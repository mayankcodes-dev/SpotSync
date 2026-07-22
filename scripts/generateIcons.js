const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <clipPath id="rounded">
      <rect width="512" height="512" rx="120" ry="120"/>
    </clipPath>
  </defs>
  <rect width="512" height="512" fill="#FF385C" rx="120" ry="120"/>
  <g clip-path="url(#rounded)">
    <polygon points="256,70 100,400 412,400" fill="white"/>
    <polygon points="175,290 256,140 337,290 310,290 256,195 202,290" fill="#FF385C"/>
    <rect x="215" y="360" width="82" height="60" fill="white" rx="8" ry="8"/>
    <rect x="238" y="380" width="36" height="40" fill="#FF385C" rx="4" ry="4"/>
  </g>
</svg>`;
  
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), svgContent);
  console.log(`Created icon-${size}.png (SVG content)`);
});

// Also create screenshot placeholders
const screenshotWide = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <rect width="1280" height="800" fill="#f8f9fa"/>
  <text x="640" y="400" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#FF385C">SpotSync</text>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'screenshot-wide.png'), screenshotWide);

const screenshotMobile = `<svg xmlns="http://www.w3.org/2000/svg" width="375" height="812" viewBox="0 0 375 812">
  <rect width="375" height="812" fill="#f8f9fa"/>
  <text x="187" y="406" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#FF385C">SpotSync</text>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'screenshot-mobile.png'), screenshotMobile);

console.log('All PWA icons created successfully!');
