#!/usr/bin/env bash
# unknown0 — one-shot backend deploy for Ubuntu 22.04 / 24.04 (run as root).
# Installs Node, Caddy (auto-HTTPS reverse proxy), WireGuard, the backend, and a
# systemd service. Idempotent: safe to re-run (it will pull + restart).
set -euo pipefail

# ===== Config (override via env when running) =====
DOMAIN="${DOMAIN:-}"                # HTTPS hostname, e.g. 213.199.51.59.nip.io or api.yourdomain.com
SITE_ORIGIN="${SITE_ORIGIN:-*}"     # site URL for CORS, e.g. https://your-site.netlify.app ("*" = any)
REPO="${REPO:-https://github.com/wayne97dev/soltech.git}"
APP_DIR="${APP_DIR:-/opt/unknown0}"
# ==================================================

[ "$(id -u)" = "0" ] || { echo "Run as root."; exit 1; }
[ -n "$DOMAIN" ] || { echo "Set DOMAIN=...  (e.g. DOMAIN=213.199.51.59.nip.io)"; exit 1; }

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

echo "==> [1/8] Base packages"
apt-get update -y
apt-get install -y git curl ufw wireguard ca-certificates gnupg \
  debian-keyring debian-archive-keyring apt-transport-https openssl

# Some VPS images ship nginx/apache listening on :80/:443 — free those ports for Caddy.
for svc in nginx apache2; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then
    echo "    stopping preinstalled $svc (frees :80/:443 for Caddy)"
    systemctl stop "$svc" || true
    systemctl disable "$svc" >/dev/null 2>&1 || true
  fi
done

echo "==> [2/8] Node.js 20"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> [3/8] Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> [4/8] Get the code"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO" "$APP_DIR"
fi

echo "==> [5/8] Install backend dependencies"
cd "$APP_DIR/api"
npm install

echo "==> [6/8] Backend config (.env) + database"
# .env must exist BEFORE prisma runs (it reads DATABASE_URL from it).
if [ ! -f "$APP_DIR/api/.env" ]; then
  cp "$APP_DIR/api/.env.example" "$APP_DIR/api/.env"
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" "$APP_DIR/api/.env"
  sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=$SITE_ORIGIN|" "$APP_DIR/api/.env"
  sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$APP_DIR/api/.env"
  echo "    wrote $APP_DIR/api/.env (edit it later for TOKEN_ADDRESS, etc.)"
else
  echo "    kept existing $APP_DIR/api/.env"
fi
npm run prisma:generate
npx prisma migrate deploy

echo "==> [7/8] systemd service"
cp "$APP_DIR/infra/deploy/unknown0-api.service" /etc/systemd/system/unknown0-api.service
systemctl daemon-reload
systemctl enable unknown0-api >/dev/null 2>&1 || true
systemctl restart unknown0-api

echo "==> [8/8] Caddy (HTTPS reverse proxy) + firewall"
sed "s|__DOMAIN__|$DOMAIN|g" "$APP_DIR/infra/deploy/Caddyfile" > /etc/caddy/Caddyfile
systemctl restart caddy

ufw allow 22/tcp   >/dev/null 2>&1 || true
ufw allow 80/tcp   >/dev/null 2>&1 || true
ufw allow 443/tcp  >/dev/null 2>&1 || true
ufw allow 51820/udp >/dev/null 2>&1 || true   # WireGuard (for when you enable the real VPN)
ufw --force enable  >/dev/null 2>&1 || true

echo ""
echo "✅ Done."
echo "   Health:  https://$DOMAIN/health   (give Caddy ~30s for the certificate)"
echo "   Next:    set NEXT_PUBLIC_API_URL=https://$DOMAIN in Netlify, then redeploy the site."
echo "   Logs:    journalctl -u unknown0-api -f"
