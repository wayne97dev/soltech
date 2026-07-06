#!/usr/bin/env bash
# unknown0 — SOCKS5 proxy that the desktop browser routes through when the VPN
# toggle is ON (per-app privacy, like Tor Browser). Run on the server (as root).
# Prototype: shared credentials, baked into the browser. A real build issues
# short-lived credentials per holder after Sign-in with Solana.
set -euo pipefail

[ "$(id -u)" = "0" ] || { echo "Run as root."; exit 1; }

PORT="${PROXY_PORT:-1080}"
PROXY_USER="${PROXY_USER:-unknown0}"
PROXY_PASS="${PROXY_PASS:-unknown0-beta}"

if ! command -v docker >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y && apt-get install -y docker.io
  systemctl enable --now docker
fi

docker rm -f unk-proxy >/dev/null 2>&1 || true
docker run -d --name unk-proxy --restart unless-stopped \
  -p "${PORT}:1080" \
  -e PROXY_USER="$PROXY_USER" \
  -e PROXY_PASSWORD="$PROXY_PASS" \
  serjs/go-socks5-proxy

ufw allow "${PORT}/tcp" >/dev/null 2>&1 || true

PUB_IP=$(curl -4 -s --max-time 8 https://api.ipify.org || hostname -I | awk '{print $1}')
echo ""
echo "✅ SOCKS5 proxy running on ${PUB_IP}:${PORT} (user: ${PROXY_USER})"
echo "   The browser routes through this when you toggle VPN on → browsing exits from ${PUB_IP}."
echo "   test: curl -x socks5h://${PROXY_USER}:${PROXY_PASS}@${PUB_IP}:${PORT} https://ifconfig.me"
