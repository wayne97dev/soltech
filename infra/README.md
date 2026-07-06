# WireGuard server (self-hosted)

Minimal guide to stand up a WireGuard exit node on an Ubuntu 22.04+ VPS.
The backend (`api`, with `WIREGUARD_PROVIDER=local`) runs on **this same host** and manages peers by running `wg`.

## Quick (one command)

On the deployed server (after `setup.sh`):

```bash
cd /opt/unknown0 && bash infra/deploy/vpn.sh
```

It generates the server keys, writes `/etc/wireguard/wg0.conf` (NAT included), starts the tunnel, switches the backend to `WIREGUARD_PROVIDER=local` with the right endpoint/pubkey, and re-syncs any existing DB peers into `wg0`. The steps below are the manual equivalent.

## 1. Install

```bash
sudo apt update && sudo apt install -y wireguard
```

## 2. Enable IP forwarding

```bash
echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/99-wireguard.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-wireguard.conf
sudo sysctl --system
```

## 3. Generate the server keys

```bash
wg genkey | sudo tee /etc/wireguard/server_private.key | wg pubkey | sudo tee /etc/wireguard/server_public.key
sudo chmod 600 /etc/wireguard/server_private.key
```

Put the contents of `server_public.key` into `api/.env` as `WG_SERVER_PUBLIC_KEY`.

## 4. Configure the `wg0` interface

`/etc/wireguard/wg0.conf` (replace `<SERVER_PRIVATE_KEY>` and `eth0` with the real public interface, see `ip route`):

```ini
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <SERVER_PRIVATE_KEY>
SaveConfig = true

# NAT: route client traffic out to the internet
PostUp   = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

> Do NOT add peers (users) here by hand: the backend adds/removes them with `wg set`.
> `SaveConfig = true` ensures peers added at runtime survive a reboot.

## 5. Start

```bash
sudo systemctl enable --now wg-quick@wg0
sudo ufw allow 51820/udp        # or open the port in your cloud provider's firewall
```

Check: `sudo wg show`.

## 6. Permissions for the backend

The backend must be able to run `wg`/`wg-quick`. Options:

- run it as `root` (simple but discouraged long-term), or
- grant the Node binary the network capability and access to `wg`, or
- expose a small privileged local agent that the backend calls (the recommended evolution for multi-region).

## Values to copy into `api/.env`

```bash
WIREGUARD_PROVIDER=local
WG_SERVER_ENDPOINT=<SERVER_PUBLIC_IP>:51820
WG_SERVER_PUBLIC_KEY=<contents of server_public.key>
WG_INTERFACE=wg0
WG_CLIENT_SUBNET=10.8.0.0/24
WG_DNS=1.1.1.1
```

---

# Search (SearXNG)

unknown0 Search proxies a self-hosted [SearXNG](https://docs.searxng.org) instance — a privacy metasearch engine that aggregates 70+ sources with no tracking, ads, or logs. The backend enforces token-gating and forwards queries to it.

## Quick (one command)

On the deployed server (after `setup.sh`):

```bash
cd /opt/unknown0 && bash infra/deploy/searxng.sh
```

It writes a SearXNG config (JSON API enabled), runs the container on `127.0.0.1:8080`, points `SEARXNG_URL` at it and restarts the backend. Search then returns real aggregated results. The steps below are the manual equivalent.

## Run it (Docker)

```bash
docker run -d --name searxng -p 8080:8080 \
  -v "$(pwd)/infra/searxng:/etc/searxng" searxng/searxng:latest
```

Or use the `searxng` service in the repo's `docker-compose.yml`.

## Enable the JSON API

unknown0 calls SearXNG's JSON output, which is **off by default**. In `infra/searxng/settings.yml` add:

```yaml
search:
  formats:
    - html
    - json
server:
  secret_key: "change-me-to-a-long-random-string"
```

Restart SearXNG, then point the backend at it in `api/.env`:

```bash
SEARXNG_URL=http://localhost:8080
```

> When `SEARXNG_URL` is empty the backend returns demo results, so the search UI works without SearXNG running.
