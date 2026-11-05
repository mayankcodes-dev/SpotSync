#!/bin/bash
# Continuation script — runs steps 4-8 of provision (skips 1-3 already done)
set -euo pipefail

APP_DIR="/home/ubuntu/SpotSync"
NODE_VERSION="22"

echo ""
echo "=============================================="
echo "  SpotSync — Continuing Deployment (Steps 4-8)"
echo "=============================================="

# ------------------------------------------------------------------
# 4. Install Node.js, PM2, Nginx
# ------------------------------------------------------------------
echo "[4/8] Installing Node.js $NODE_VERSION, pm2, nginx, git..."
sudo apt-get install -y -qq curl git

if ! command -v node &>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
echo "    Node.js $(node -v) | npm $(npm -v)"

sudo npm install -g pm2 --quiet
echo "    PM2 $(pm2 --version)"

sudo apt-get install -y -qq nginx
echo "    Nginx installed."

# ------------------------------------------------------------------
# 5. Clone SpotSync
# ------------------------------------------------------------------
echo "[5/8] Cloning SpotSync..."
if [[ -d "$APP_DIR/.git" ]]; then
  echo "    Repo exists — pulling latest..."
  cd "$APP_DIR" && git pull origin main
else
  git clone https://github.com/mayankcodes-dev/SpotSync.git "$APP_DIR"
fi

# ------------------------------------------------------------------
# 6. npm install + build
# ------------------------------------------------------------------
echo "[6/8] Installing npm deps & building TypeScript..."
cd "$APP_DIR"
npm ci 2>&1 | tail -4
npm run build 2>&1 | tail -4
npm prune --omit=dev 2>&1 | tail -4
echo "    Build complete."

# ------------------------------------------------------------------
# 7. .env — copy from /home/ubuntu/.env if present
# ------------------------------------------------------------------
echo "[7/8] .env setup..."
if [[ -f "/home/ubuntu/.env" ]]; then
  cp /home/ubuntu/.env "$APP_DIR/.env"
  echo "    .env copied from /home/ubuntu/.env"
elif [[ -f "$APP_DIR/.env" ]]; then
  echo "    .env already at $APP_DIR/.env"
else
  echo "ERROR: No .env found at /home/ubuntu/.env or $APP_DIR/.env"
  exit 1
fi

# ------------------------------------------------------------------
# 8. PM2 start
# ------------------------------------------------------------------
echo "[8/8] Starting SpotSync with PM2..."
cd "$APP_DIR"

pm2 describe spotsync &>/dev/null && pm2 delete spotsync || true

pm2 start dist/app.js \
  --name "spotsync" \
  --cwd "$APP_DIR" \
  --max-memory-restart 800M \
  --restart-delay 3000

pm2 save

PM2_STARTUP=$(pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>&1 | grep "sudo" || true)
if [[ -n "$PM2_STARTUP" ]]; then
  eval "$PM2_STARTUP"
fi

echo "    PM2 status:"
pm2 status

# ------------------------------------------------------------------
# Nginx reverse proxy
# ------------------------------------------------------------------
echo ""
echo "[NGINX] Configuring reverse proxy (port 80 → 3000)..."

sudo tee /etc/nginx/sites-available/spotsync > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX_CONF

sudo ln -sf /etc/nginx/sites-available/spotsync /etc/nginx/sites-enabled/spotsync
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
echo "    Nginx configured."

# ------------------------------------------------------------------
# Verify
# ------------------------------------------------------------------
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:3000" || echo "unreachable")

echo ""
echo "=============================================="
echo "  Deployment Result"
echo "=============================================="
echo "  App URL    : http://129.225.71.0"
echo "  HTTP Status: $HTTP_STATUS"
echo ""

if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "302" ]]; then
  echo "  SUCCESS - App is live!"
else
  echo "  WARNING: Got $HTTP_STATUS — check: pm2 logs spotsync"
  pm2 logs spotsync --lines 20 --nostream || true
fi
