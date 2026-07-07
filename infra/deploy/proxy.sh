#!/usr/bin/env bash
# unknown0 — HTTP proxy the desktop browser routes through when the VPN toggle is ON
# (per-app privacy, like Tor Browser). Chromium/Electron supports proxy auth for HTTP
# proxies but NOT for SOCKS5, so we use tinyproxy with Basic auth.
# Prototype: shared credentials baked into the browser; a real build issues them per holder.
set -euo pipefail

[ "$(id -u)" = "0" ] || { echo "Run as root."; exit 1; }

PORT="${PROXY_PORT:-8888}"
PROXY_USER="${PROXY_USER:-unknown0}"
PROXY_PASS="${PROXY_PASS:-unknown0-beta}"

# Drop the previous SOCKS5 container if it's still around.
docker rm -f unk-proxy >/dev/null 2>&1 || true

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y tinyproxy

cat > /etc/tinyproxy/tinyproxy.conf <<EOF
User tinyproxy
Group tinyproxy
Port ${PORT}
Listen 0.0.0.0
Timeout 600
BasicAuth ${PROXY_USER} ${PROXY_PASS}
Allow 0.0.0.0/0
ConnectPort 443
ConnectPort 563
LogLevel Warning
EOF

systemctl enable tinyproxy >/dev/null 2>&1 || true
systemctl restart tinyproxy
ufw allow "${PORT}/tcp" >/dev/null 2>&1 || true

PUB_IP=$(curl -4 -s --max-time 8 https://api.ipify.org || hostname -I | awk '{print $1}')
echo ""
echo "✅ HTTP proxy running on ${PUB_IP}:${PORT} (user: ${PROXY_USER})"
echo "   The browser routes through this when VPN is toggled on → browsing exits from ${PUB_IP}."
echo "   test: curl -x http://${PROXY_USER}:${PROXY_PASS}@${PUB_IP}:${PORT} https://ifconfig.me"
