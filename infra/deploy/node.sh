#!/usr/bin/env bash
# unknown0 — stand up a REMOTE VPN region node (WireGuard exit + control agent).
# Run as root on a fresh Ubuntu 22.04/24.04 VPS in the region you want to add.
# It does NOT run the API or touch the chain — it's a pure exit node the central
# API drives through the agent. At the end it prints the JSON to paste into the
# API's REGIONS_JSON.
set -euo pipefail

[ "$(id -u)" = "0" ] || { echo "Run as root."; exit 1; }

# ===== Config (override via env) =====
WG_PORT="${WG_PORT:-51820}"
WG_IFACE="${WG_IFACE:-wg0}"
AGENT_PORT="${AGENT_PORT:-8787}"
SUBNET="${SUBNET:-10.9.0.0/24}"          # MUST differ from every other region
SERVER_WG_IP="${SERVER_WG_IP:-10.9.0.1}" # this node's address inside the tunnel
REGION_ID="${REGION_ID:-us}"
REGION_NAME="${REGION_NAME:-United States}"
REGION_FLAG="${REGION_FLAG:-🇺🇸}"
REGION_CITY="${REGION_CITY:-New York}"
API_IP="${API_IP:-}"                      # optional: lock the agent to this IP only
NODE_DIR="/opt/unknown0-node"
# =====================================

export DEBIAN_FRONTEND=noninteractive
echo "==> [1/6] Packages (WireGuard, Node, tools)"
apt-get update -y
apt-get install -y wireguard iproute2 ufw curl openssl
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> [2/6] IP forwarding"
sed -i '/net.ipv4.ip_forward/d' /etc/sysctl.conf
echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
sysctl -p >/dev/null

PUB_IP=$(curl -4 -s --max-time 8 https://api.ipify.org || ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1 | head -1)
NIC=$(ip -4 route ls | awk '/default/ {print $5; exit}')

echo "==> [3/6] WireGuard interface ${WG_IFACE} (${SERVER_WG_IP})"
if [ ! -f "/etc/wireguard/${WG_IFACE}.conf" ]; then
  umask 077
  SERVER_PRIV=$(wg genkey)
  SERVER_PUB=$(echo "$SERVER_PRIV" | wg pubkey)
  cat > "/etc/wireguard/${WG_IFACE}.conf" <<EOF
[Interface]
Address = ${SERVER_WG_IP}/24
ListenPort = ${WG_PORT}
PrivateKey = ${SERVER_PRIV}
PostUp   = iptables -A FORWARD -i ${WG_IFACE} -j ACCEPT; iptables -t nat -A POSTROUTING -s ${SUBNET} -o ${NIC} -j MASQUERADE
PostDown = iptables -D FORWARD -i ${WG_IFACE} -j ACCEPT; iptables -t nat -D POSTROUTING -s ${SUBNET} -o ${NIC} -j MASQUERADE
EOF
else
  SERVER_PUB=$(wg show "${WG_IFACE}" public-key)
fi
systemctl enable "wg-quick@${WG_IFACE}" >/dev/null 2>&1 || true
systemctl restart "wg-quick@${WG_IFACE}"

echo "==> [4/6] Agent"
mkdir -p "$NODE_DIR"
cp "$(dirname "$0")/../agent/agent.mjs" "$NODE_DIR/agent.mjs"
AGENT_SECRET="${AGENT_SECRET:-$(openssl rand -hex 24)}"
cat > "$NODE_DIR/agent.env" <<EOF
AGENT_SECRET=${AGENT_SECRET}
AGENT_PORT=${AGENT_PORT}
WG_INTERFACE=${WG_IFACE}
EOF
chmod 600 "$NODE_DIR/agent.env"
cp "$(dirname "$0")/../agent/unknown0-agent.service" /etc/systemd/system/unknown0-agent.service
systemctl daemon-reload
systemctl enable unknown0-agent >/dev/null 2>&1 || true
systemctl restart unknown0-agent

echo "==> [5/6] Firewall"
ufw allow 22/tcp                >/dev/null 2>&1 || true
ufw allow "${WG_PORT}/udp"      >/dev/null 2>&1 || true
if [ -n "$API_IP" ]; then
  ufw allow from "${API_IP}" to any port "${AGENT_PORT}" proto tcp >/dev/null 2>&1 || true
else
  ufw allow "${AGENT_PORT}/tcp" >/dev/null 2>&1 || true
fi
ufw --force enable >/dev/null 2>&1 || true

echo "==> [6/6] Done"
echo ""
echo "============================================================"
echo " Region node is UP. Add this object to the API's REGIONS_JSON"
echo " (the array in /opt/unknown0/api/.env), then restart the API."
echo "============================================================"
cat <<EOF
{
  "id": "${REGION_ID}",
  "name": "${REGION_NAME}",
  "flag": "${REGION_FLAG}",
  "city": "${REGION_CITY}",
  "endpoint": "${PUB_IP}:${WG_PORT}",
  "serverPublicKey": "${SERVER_PUB}",
  "clientSubnet": "${SUBNET}",
  "dns": "1.1.1.1",
  "control": { "kind": "agent", "url": "http://${PUB_IP}:${AGENT_PORT}", "secret": "${AGENT_SECRET}" },
  "proxy": "http://${PUB_IP}:8888"
}
EOF
echo "(the \"proxy\" field assumes you also run proxy.sh on this node — needed for the browser VPN)"
echo ""
echo "Agent health:  curl -s http://${PUB_IP}:${AGENT_PORT}/health"
