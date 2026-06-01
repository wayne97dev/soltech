# Server WireGuard (self-hosted)

Guida minima per tirare su un exit node WireGuard su una VPS Ubuntu 22.04+.
Il backend (`api`, con `WIREGUARD_PROVIDER=local`) gira **su questo stesso host** e gestisce i peer eseguendo `wg`.

## 1. Installazione

```bash
sudo apt update && sudo apt install -y wireguard
```

## 2. Abilita l'IP forwarding

```bash
echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/99-wireguard.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-wireguard.conf
sudo sysctl --system
```

## 3. Genera le chiavi del server

```bash
wg genkey | sudo tee /etc/wireguard/server_private.key | wg pubkey | sudo tee /etc/wireguard/server_public.key
sudo chmod 600 /etc/wireguard/server_private.key
```

Il contenuto di `server_public.key` va messo in `api/.env` come `WG_SERVER_PUBLIC_KEY`.

## 4. Configura l'interfaccia `wg0`

`/etc/wireguard/wg0.conf` (sostituisci `<SERVER_PRIVATE_KEY>` e `eth0` con l'interfaccia pubblica reale, vedi `ip route`):

```ini
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <SERVER_PRIVATE_KEY>
SaveConfig = true

# NAT: instrada il traffico dei client verso internet
PostUp   = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

> I peer (gli utenti) NON vanno scritti a mano qui: li aggiunge/rimuove il backend con `wg set`.
> `SaveConfig = true` fa sì che i peer aggiunti a runtime sopravvivano al riavvio.

## 5. Avvia

```bash
sudo systemctl enable --now wg-quick@wg0
sudo ufw allow 51820/udp        # o apri la porta nel firewall del cloud provider
```

Verifica: `sudo wg show`.

## 6. Permessi per il backend

Il backend deve poter eseguire `wg`/`wg-quick`. Le opzioni:

- eseguirlo come `root` (semplice ma sconsigliato a lungo termine), oppure
- dare al binario Node la capability di rete e l'accesso a `wg`, oppure
- esporre un piccolo agent locale privilegiato che il backend chiama (evoluzione consigliata per il multi-region).

## Valori da copiare in `api/.env`

```bash
WIREGUARD_PROVIDER=local
WG_SERVER_ENDPOINT=<IP_PUBBLICO_DEL_SERVER>:51820
WG_SERVER_PUBLIC_KEY=<contenuto di server_public.key>
WG_INTERFACE=wg0
WG_CLIENT_SUBNET=10.8.0.0/24
WG_DNS=1.1.1.1
```
