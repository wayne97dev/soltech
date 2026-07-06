#!/usr/bin/env bash
# unknown0 — enable REAL search: run SearXNG (Docker) and wire the backend to it.
# Run on the deployed server (as root), after setup.sh.
set -euo pipefail

[ "$(id -u)" = "0" ] || { echo "Run as root."; exit 1; }

APP_DIR="${APP_DIR:-/opt/unknown0}"
SEARX_DIR="$APP_DIR/infra/searxng"
PORT="${PORT:-8080}"

# Install Docker if missing (fresh VPS).
if ! command -v docker >/dev/null; then
  echo "==> Installing Docker"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y docker.io
  systemctl enable --now docker
fi

mkdir -p "$SEARX_DIR"

# SearXNG config: inherit defaults, enable the JSON API (off by default), random secret.
if [ ! -f "$SEARX_DIR/settings.yml" ]; then
  cat > "$SEARX_DIR/settings.yml" <<EOF
use_default_settings: true
server:
  secret_key: "$(openssl rand -hex 32)"
  limiter: false
search:
  formats:
    - html
    - json
EOF
  echo "wrote $SEARX_DIR/settings.yml"
fi

# Run (or refresh) the container, bound to localhost only (reachable just by the backend).
docker rm -f searxng >/dev/null 2>&1 || true
docker run -d --name searxng --restart unless-stopped \
  -p "127.0.0.1:${PORT}:8080" \
  -v "$SEARX_DIR:/etc/searxng" \
  searxng/searxng:latest

# Point the backend at SearXNG and restart it.
ENV_FILE="$APP_DIR/api/.env"
if grep -q '^SEARXNG_URL=' "$ENV_FILE"; then
  sed -i "s|^SEARXNG_URL=.*|SEARXNG_URL=http://localhost:${PORT}|" "$ENV_FILE"
else
  echo "SEARXNG_URL=http://localhost:${PORT}" >> "$ENV_FILE"
fi
systemctl restart unknown0-api

echo ""
echo "✅ SearXNG running on 127.0.0.1:${PORT}; backend restarted."
echo "   Search on the site now returns real aggregated results (source: searxng)."
echo "   Logs: docker logs -f searxng"
