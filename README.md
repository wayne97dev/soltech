# SolTech VPN

VPN privata e veloce, **gratuita solo per gli holder del token SolTech** (SPL su Solana, lanciato via pump.fun).
L'accesso è legato al possesso del token: finché tieni il token nel wallet, hai la VPN; se vendi sotto la soglia, l'accesso viene revocato automaticamente.

> Stato: **MVP** — portale web (frontend + backend) + WireGuard self-hosted. Il token e le feature aggiuntive arrivano dopo.

---

## Come funziona

```
┌──────────┐   1. connetti wallet      ┌─────────────┐   3. leggo saldo token   ┌──────────┐
│  Browser │ ────────────────────────► │   Backend   │ ───────────────────────► │  Solana  │
│ (Next.js)│   2. firma messaggio      │  (Fastify)  │ ◄─────────────────────── │   RPC    │
│ + wallet │ ◄──────────────────────── │             │   4. se idoneo:          └──────────┘
└──────────┘   5. config WireGuard     │             │      crea peer WireGuard ┌──────────┐
                                        │             │ ───────────────────────► │ Server   │
                                        └─────────────┘                          │ WireGuard│
                                              │  6. cron ricontrolla i saldi     └──────────┘
                                              └────► se ha venduto → revoca
```

1. L'utente connette il wallet (Phantom / Solflare).
2. Firma un messaggio **Sign-in with Solana** — gratis, nessuna transazione, prova solo che il wallet è suo.
3. Il backend legge **on-chain** quanti token possiede.
4. Se è ≥ soglia → genera una coppia di chiavi WireGuard, assegna un IP e abilita il peer sul server VPN.
5. Il portale restituisce il file `.conf` da importare nell'app WireGuard.
6. Un worker (cron) ricontrolla periodicamente i saldi e **revoca** chi è sceso sotto soglia.

---

## Struttura del repo

```
soltech/
├── api/                 # Backend Fastify + TypeScript
│   ├── prisma/          # Schema database (SQLite in dev, Postgres in prod)
│   └── src/
│       ├── config.ts    # Tutta la configurazione da .env
│       ├── siws.ts      # Sign-in with Solana (messaggio + verifica firma)
│       ├── solana.ts    # Lettura saldo token + regole di idoneità
│       ├── wireguard.ts # Chiavi, IP, provider (mock/local), generazione .conf
│       ├── routes/      # /auth/* e /access/*
│       ├── worker/      # Ri-verifica periodica dei saldi
│       └── index.ts     # Avvio server + worker
├── web/                 # Frontend Next.js + Solana wallet-adapter
│   ├── app/             # Pagina, providers, stile
│   └── lib/api.ts       # Client verso il backend
├── infra/               # Come tirare su un server WireGuard reale
└── docker-compose.yml   # Postgres pronto per la produzione
```

---

## Avvio rapido (sviluppo locale, senza token né server VPN)

Grazie a `DEV_BYPASS_TOKEN_GATE=true` e al provider WireGuard `mock`, puoi provare **tutto il flusso** prima ancora di lanciare il token o di avere un server VPN.

### 1. Backend

```bash
cd api
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init   # crea il DB SQLite locale
npm run dev                             # http://localhost:4000
```

### 2. Frontend (in un altro terminale)

```bash
cd web
cp .env.example .env.local
npm install
npm run dev                             # http://localhost:3000
```

Apri **http://localhost:3000**, connetti il wallet, firma, e — grazie al bypass dev — vedrai la config WireGuard generata (mock).

---

## Collegare il token vero (dopo il lancio su pump.fun)

Nel file `api/.env`:

```bash
DEV_BYPASS_TOKEN_GATE=false
TOKEN_MINT=<mint_address_dato_da_pumpfun>
MIN_TOKEN_BALANCE=100000          # quanti token servono per la VPN gratis
SOLANA_RPC_URL=https://...        # consigliato un RPC dedicato (Helius/QuickNode), gli endpoint pubblici sono rate-limited
```

Da quel momento l'accesso dipende dal saldo reale on-chain. Non serve toccare il codice.

---

## Collegare un server WireGuard reale

1. Segui [`infra/README.md`](infra/README.md) per tirare su un server (Ubuntu + WireGuard).
2. Nel file `api/.env`:

```bash
WIREGUARD_PROVIDER=local              # esegue `wg` su questo host
WG_SERVER_ENDPOINT=<ip_server>:51820
WG_SERVER_PUBLIC_KEY=<public_key_del_server>
WG_INTERFACE=wg0
```

> Con il provider `local` il backend deve girare **sullo stesso host** del server WireGuard (o tramite un piccolo agent) e con i permessi per eseguire `wg`. Per più region si replica questo schema dietro un selettore di server.

---

## Passaggio a Postgres (produzione)

1. `api/prisma/schema.prisma` → cambia `provider = "sqlite"` in `provider = "postgresql"`.
2. `api/.env` → `DATABASE_URL=postgresql://soltech:soltech@localhost:5432/soltech?schema=public`.
3. Avvia il DB con `docker compose up -d` (usa il `docker-compose.yml` incluso) e `npm run prisma:migrate`.

---

## Note di sicurezza (da affrontare prima del lancio pubblico)

- **Chiavi private WireGuard**: in questo MVP il server genera la chiave del client e la conserva per poter rimostrare la config. È comodo ma non ideale. Evoluzione: far generare la chiave **sul dispositivo dell'utente** e inviare solo la chiave pubblica. → vedi roadmap.
- **Privacy / no-logs**: l'accesso è legato a un wallet on-chain, ma il *traffico* VPN non deve essere collegabile al wallet. Tenere separati i dati di accesso dai dati di sessione.
- **Condivisione config**: limitare i peer per wallet e le connessioni concorrenti per evitare che una sola persona condivida l'accesso.
- **Abusi / legale**: un exit node implica gestione di abuse report (DMCA ecc.). Va previsto prima di aprire al pubblico.
- `JWT_SECRET` lungo e casuale in produzione.

---

## Roadmap (i "futures" da definire)

- [ ] Selezione server / multi-region
- [ ] Tier di accesso in base alla quantità di token tenuti (più tieni, più server/banda)
- [ ] Generazione chiavi lato client (privacy)
- [ ] QR code della config + app desktop/mobile brandizzata
- [ ] Limiti dispositivi e connessioni concorrenti
- [ ] Dashboard: uptime, banda, stato peer
- [ ] Pagamenti/staking opzionali per chi non vuole holdare
