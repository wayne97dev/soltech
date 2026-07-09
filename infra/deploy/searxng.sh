#!/usr/bin/env bash
# unknown0 — enable REAL search: run SearXNG (Docker), wire the backend to it (internal,
# gated), AND expose it publicly via Caddy so the desktop browser can search with our
# engine (no login). Run on the deployed server (as root), after setup.sh. Idempotent.
set -euo pipefail

[ "$(id -u)" = "0" ] || { echo "Run as root."; exit 1; }

APP_DIR="${APP_DIR:-/opt/unknown0}"
SEARX_DIR="$APP_DIR/infra/searxng"
PORT="${PORT:-8080}"
CADDY="/etc/caddy/Caddyfile"

# Install Docker if missing (fresh VPS).
if ! command -v docker >/dev/null; then
  echo "==> Installing Docker"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y docker.io
  systemctl enable --now docker
fi

# Public hostname for the browser to use (nip.io resolves this to our IP, no DNS needed).
PUB_IP=$(curl -4 -s --max-time 8 https://api.ipify.org || hostname -I | awk '{print $1}')
SEARCH_HOST="${SEARCH_HOST:-search.${PUB_IP}.nip.io}"

mkdir -p "$SEARX_DIR"

# SearXNG config: JSON API on, limiter off (so the browser can query directly),
# base_url set so links/redirects work behind the proxy.
cat > "$SEARX_DIR/settings.yml" <<EOF
use_default_settings: true
server:
  secret_key: "$(openssl rand -hex 32)"
  base_url: "https://${SEARCH_HOST}/"
  limiter: false
search:
  # English results by default (SearXNG otherwise auto-detects the visitor's
  # browser language — Italian testers were getting Italian results).
  default_lang: "en"
  formats:
    - html
    - json
EOF

# (Re)start the container, bound to localhost only (Caddy proxies to it).
docker rm -f searxng >/dev/null 2>&1 || true
docker run -d --name searxng --restart unless-stopped \
  -p "127.0.0.1:${PORT}:8080" \
  -v "$SEARX_DIR:/etc/searxng" \
  searxng/searxng:latest

# Backend (gated /search) keeps using it internally.
ENV_FILE="$APP_DIR/api/.env"
if grep -q '^SEARXNG_URL=' "$ENV_FILE"; then
  sed -i "s|^SEARXNG_URL=.*|SEARXNG_URL=http://localhost:${PORT}|" "$ENV_FILE"
else
  echo "SEARXNG_URL=http://localhost:${PORT}" >> "$ENV_FILE"
fi
systemctl restart unknown0-api

# Expose publicly via Caddy (auto-HTTPS) so the browser can search with our engine.
if ! grep -q "$SEARCH_HOST" "$CADDY" 2>/dev/null; then
  cat >> "$CADDY" <<EOF

# unknown0 Search (public) — used by the desktop browser's search bar
${SEARCH_HOST} {
	reverse_proxy localhost:${PORT}
}
EOF
  echo "    added $SEARCH_HOST to Caddy"
fi
systemctl reload caddy

echo ""
echo "✅ SearXNG live."
echo "   backend (gated):  http://localhost:${PORT}"
echo "   public (browser): https://${SEARCH_HOST}/   (give Caddy ~30s for the certificate)"
echo "   test:             curl -s 'https://${SEARCH_HOST}/search?q=bitcoin&format=json' | head -c 120"
echo ""
echo "   -> the browser build points its search bar at https://${SEARCH_HOST}"
