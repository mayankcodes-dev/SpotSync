#!/bin/bash
set -e

APP_DIR="/home/ubuntu/SpotSync"

echo "[1] Fixing node_modules ownership..."
chown -R ubuntu:ubuntu "$APP_DIR"
echo "    Done."

echo "[2] Installing cookie-parser..."
cd "$APP_DIR"
npm install cookie-parser
echo "    Done."

echo "[3] Patching dist/app.js to add cookie-parser..."
node << 'JSEOF'
const fs = require('fs');
const file = '/home/ubuntu/SpotSync/dist/app.js';
let code = fs.readFileSync(file, 'utf8');

if (code.includes('cookie-parser')) {
  console.log('    Already patched — skipping.');
} else {
  // Add cookie-parser before doubleCsrfProtection
  code = code.replace(
    'app.use(doubleCsrfProtection);',
    'app.use(require("cookie-parser")());\napp.use(doubleCsrfProtection);'
  );
  fs.writeFileSync(file, code);
  console.log('    PATCHED OK.');
}
JSEOF

echo "[4] Restarting PM2..."
pm2 restart spotsync
sleep 3
pm2 status

echo "[5] Testing login route..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/login)
echo "    /login HTTP status: $STATUS"

if [ "$STATUS" = "200" ]; then
  echo ""
  echo "SUCCESS - Login route is working!"
else
  echo ""
  echo "Still failing with $STATUS — check: pm2 logs spotsync --lines 20 --nostream"
fi
