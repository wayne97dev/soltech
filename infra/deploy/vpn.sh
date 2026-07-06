#!/usr/bin/env bash
# unknown0 — enable the REAL VPN: configure WireGuard (wg0) on this host and
# switch the backend from the mock provider to `local`.
# Run on the deployed server (as root), after setup.sh. Idempotent.
set -euo pipefail

[ "$(id -u)" = "0" ] || { echo "Run as root."; exit 1; }

APP_DIR="${APP_DIR:-/opt/unknown0}"
WG_IF="${WG_IF:-wg0}"
WG_PORT="${WG_PORT:-51820}"
WG_ADDR="${WG_ADDR:-10.8.0.1/24}"
ENV_FILE="$APP_DIR/api/.env"

[ -f "$ENV_FILE" ] || { echo "$ENV_FILE not found — run infra/deploy/setup.sh first."; exit 1; }
command -v wg >/dev/null || { echo "wireguard not installed — run infra/deploy/setup.sh first."; exit 1; }

echo "==> [1/6] Detect network"
PUB_IF=$(ip -4 route show default | awk '{print $5; exit}')
PUB_IP=$(curl -4 -s --max-time 8 https://api.ipify.org || hostname -I | awk '{print $1}')
[ -n "$PUB_IF" ] && [ -n "$PUB_IP" ] || { echo "Could not detect public interface/IP."; exit 1; }
echo "    interface=$PUB_IF  ip=$PUB_IP"

echo "==> [2/6] Enable IP forwarding"
cat > /etc/sysctl.d/99-wireguard.conf <<EOF
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
EOF
sysctl --system >/dev/null

echo "==> [3/6] Server keys + $WG_IF config"
if [ ! -f "/etc/wireguard/$WG_IF.conf" ]; then
  umask 077
  wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
  SERVER_PRIV=$(cat /etc/wireguard/server_private.key)
  cat > "/etc/wireguard/$WG_IF.conf" <<EOF
[Interface]
Address = $WG_ADDR
ListenPort = $WG_PORT
PrivateKey = $SERVER_PRIV
SaveConfig = true

PostUp   = iptables -A FORWARD -i $WG_IF -j ACCEPT; iptables -A FORWARD -o $WG_IF -j ACCEPT; iptables -t nat -A POSTROUTING -o $PUB_IF -j MASQUERADE
PostDown = iptables -D FORWARD -i $WG_IF -j ACCEPT; iptables -D FORWARD -o $WG_IF -j ACCEPT; iptables -t nat -D POSTROUTING -o $PUB_IF -j MASQUERADE
EOF
  echo "    wrote /etc/wireguard/$WG_IF.conf (new keys)"
else
  echo "    kept existing /etc/wireguard/$WG_IF.conf"
fi
SERVER_PUB=$(cat /etc/wireguard/server_public.key)

echo "==> [4/6] Start WireGuard + firewall"
systemctl enable --now "wg-quick@$WG_IF" >/dev/null 2>&1 || systemctl restart "wg-quick@$WG_IF"
ufw allow "$WG_PORT/udp"        >/dev/null 2>&1 || true
ufw route allow in on "$WG_IF"  >/dev/null 2>&1 || true
ufw route allow out on "$WG_IF" >/dev/null 2>&1 || true

echo "==> [5/6] Point the backend at the real tunnel"
set_env() { # set_env KEY VALUE
  if grep -q "^$1=" "$ENV_FILE"; then
    sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"
  else
    echo "$1=$2" >> "$ENV_FILE"
  fi
}
set_env WIREGUARD_PROVIDER local
set_env WG_SERVER_ENDPOINT "$PUB_IP:$WG_PORT"
set_env WG_SERVER_PUBLIC_KEY "$SERVER_PUB"
set_env WG_INTERFACE "$WG_IF"
systemctl restart unknown0-api

echo "==> [6/6] Sync existing DB peers into $WG_IF"
(cd "$APP_DIR/api" && node scripts/sync-peers.cjs) || echo "    (peer sync skipped/failed — new provisions still work)"

echo ""
echo "✅ Real VPN is ON."
echo "   Server pubkey : $SERVER_PUB"
echo "   Endpoint      : $PUB_IP:$WG_PORT"
echo "   Check         : wg show $WG_IF"
echo "   Test          : provision on the site, import the .conf in the WireGuard app,"
echo "                   then your public IP should become $PUB_IP"
