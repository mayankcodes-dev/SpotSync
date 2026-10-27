#!/usr/bin/env bash
# =============================================================================
# SpotSync — Remote Server Provisioning Script
# Run this ON the OCI VM via SSH once it is reachable.
# Usage:  bash provision_server.sh [e2micro|a1flex]
# =============================================================================
set -euo pipefail

SHAPE="${1:-e2micro}"   # e2micro = 1 GB RAM → needs swap; a1flex = 6 GB → skip swap
APP_DIR="/home/ubuntu/SpotSync"
NODE_VERSION="20"       # LTS

echo ""
echo "=============================================="
echo "  SpotSync OCI Provisioning Script"
echo "  Shape: $SHAPE"
echo "=============================================="

# ------------------------------------------------------------------
# 1. System update
# ------------------------------------------------------------------
echo "[1/8] Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ------------------------------------------------------------------
# 2. Swap (only for E2.1.Micro — 1 GB RAM)
# ------------------------------------------------------------------
if [[ "$SHAPE" == "e2micro" ]]; then
  echo "[2/8] Creating 2 GB swap (E2.1.Micro has 1 GB RAM)..."
  if ! swapon --show | grep -q /swapfile; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    echo "    Swap created and activated."
  else
    echo "    Swap already exists — skipping."
  fi
else
  echo "[2/8] Skipping swap (A1.Flex has 6 GB RAM)."
fi

# ------------------------------------------------------------------
# 3. Open iptables ports (OCI Ubuntu blocks by default at OS level)
# ------------------------------------------------------------------
echo "[3/8] Opening firewall ports 22, 80, 443, 3000..."
sudo apt-get install -y -qq iptables-persistent netfilter-persistent

for PORT in 80 443 3000; do
  if ! sudo iptables -C INPUT -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$PORT" -j ACCEPT
    echo "    Opened port $PORT"
  else
    echo "    Port $PORT already open."
  fi
done

sudo netfilter-persistent save

# ------------------------------------------------------------------
# 4. Install dependencies: curl, git, Node.js LTS, pm2, nginx
# ------------------------------------------------------------------
echo "[4/8] Installing Node.js $NODE_VERSION LTS, pm2, nginx, git..."
sudo apt-get install -y -qq curl git

# Node.js via NodeSource
if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.versions.node.split(\".\")[0])')" != "$NODE_VERSION" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | sudo -E bash - -qq
  sudo apt-get install -y -qq nodejs
fi
echo "    Node.js $(node -v) | npm $(npm -v)"

sudo npm install -g pm2 --quiet
echo "    PM2 $(pm2 --version)"

sudo apt-get install -y -qq nginx
echo "    Nginx installed."

# ------------------------------------------------------------------
# 5. Clone / update SpotSync
# ------------------------------------------------------------------
echo "[5/8] Cloning SpotSync..."
if [[ -d "$APP_DIR/.git" ]]; then
  echo "    Repo already exists — pulling latest..."
  cd "$APP_DIR" && git pull origin main
else
  git clone https://github.com/mayankcodes-dev/SpotSync.git "$APP_DIR"
fi

# ------------------------------------------------------------------
# 6. Install Node dependencies & build TypeScript
# ------------------------------------------------------------------
echo "[6/8] Installing npm deps & building TypeScript..."
cd "$APP_DIR"
npm install --omit=dev 2>&1 | tail -4

# Build server-side TypeScript → dist/
npm run build 2>&1 | tail -4

# Build client-side TypeScript → public/javascripts/
npm run build:client 2>&1 | tail -4

echo "    Build complete."

# ------------------------------------------------------------------
# 7. .env file — copy from local or prompt
# ------------------------------------------------------------------
echo "[7/8] .env setup..."
if [[ ! -f "$APP_DIR/.env" ]]; then
  echo ""
  echo "  ⚠️  No .env file found at $APP_DIR/.env"
  echo ""
  echo "  You need to provide your environment variables."
  echo "  Run this from your LOCAL machine to copy your .env:"
  echo ""
  echo "  scp -i ~/.ssh/oci_spotsync .env ubuntu@<YOUR_PUBLIC_IP>:$APP_DIR/.env"
  echo ""
  echo "  Then re-run this script, OR paste your .env content now"
  echo "  (press Ctrl+D when done):"
  echo ""
  cat > "$APP_DIR/.env"
  echo "    .env saved."
else
  echo "    .env already present — skipping."
fi

# ------------------------------------------------------------------
# 8. PM2 — start / restart app
# ------------------------------------------------------------------
echo "[8/8] Starting SpotSync with PM2..."
cd "$APP_DIR"

pm2 describe spotsync &>/dev/null && pm2 delete spotsync || true

pm2 start dist/server.js \
  --name "spotsync" \
  --max-memory-restart 800M \
  --restart-delay 3000

pm2 save

# Configure PM2 to survive reboots
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
echo "[NGINX] Configuring reverse proxy..."

APP_PORT="${PORT:-3000}"

sudo tee /etc/nginx/sites-available/spotsync > /dev/null <<NGINX_CONF
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN"       always;
    add_header X-Content-Type-Options "nosniff"   always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX_CONF

sudo ln -sf /etc/nginx/sites-available/spotsync /etc/nginx/sites-enabled/spotsync
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx

echo "    Nginx configured."

# ------------------------------------------------------------------
# Done — verify
# ------------------------------------------------------------------
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me || curl -s --max-time 5 api.ipify.org || echo "unknown")

echo ""
echo "=============================================="
echo "  ✅  SpotSync deployment complete!"
echo "=============================================="
echo "  Public IP : $PUBLIC_IP"
echo "  App URL   : http://$PUBLIC_IP"
echo ""
echo "  Checking HTTP response..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:${APP_PORT}" || echo "unreachable")
echo "  Status    : $HTTP_STATUS"
echo ""
echo "  PM2 logs  : pm2 logs spotsync"
echo "  App dir   : $APP_DIR"
echo ""

if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "302" ]]; then
  echo "  🎉 App is responding correctly!"
else
  echo "  ⚠️  App returned $HTTP_STATUS — check pm2 logs spotsync"
fi
