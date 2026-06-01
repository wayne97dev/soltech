# SolTech VPN

A fast, private VPN that is **free only for holders of the SolTech token** (an SPL token on Solana, launched via pump.fun).
Access is tied to token ownership: hold the token and you keep the VPN; sell below the threshold and access is revoked automatically.

> Status: **MVP** — web portal (frontend + backend) + self-hosted WireGuard. The token and the extra features come later.

---

## How it works

```
┌──────────┐   1. connect wallet       ┌─────────────┐   3. read token balance  ┌──────────┐
│  Browser │ ────────────────────────► │   Backend   │ ───────────────────────► │  Solana  │
│ (Next.js)│   2. sign message         │  (Fastify)  │ ◄─────────────────────── │   RPC    │
│ + wallet │ ◄──────────────────────── │             │   4. if eligible:        └──────────┘
└──────────┘   5. WireGuard config     │             │      create WG peer      ┌──────────┐
                                        │             │ ───────────────────────► │ WireGuard│
                                        └─────────────┘                          │  server  │
                                              │  6. cron re-checks balances      └──────────┘
                                              └────► sold below threshold → revoke
```

1. The user connects a wallet (Phantom / Solflare).
2. They sign a **Sign-in with Solana** message — free, no transaction, it only proves the wallet is theirs.
3. The backend reads the token balance **on-chain**.
4. If it is ≥ threshold → it generates a WireGuard key pair, assigns an IP, and enables the peer on the VPN server.
5. The portal returns a `.conf` file to import into the WireGuard app.
6. A worker (cron) periodically re-checks balances and **revokes** anyone who dropped below the threshold.

---

## Repository structure

```
soltech/
├── api/                      # Backend — Fastify + TypeScript
│   ├── prisma/               # Database schema (SQLite in dev, Postgres in prod)
│   ├── scripts/smoke.cjs     # End-to-end smoke test
│   └── src/
│       ├── config.ts         # All configuration, loaded from .env
│       ├── siws.ts           # Sign-in with Solana (message + signature verification)
│       ├── solana.ts         # Token balance read + eligibility rules
│       ├── wireguard.ts      # Keys, IP allocation, provider (mock/local), .conf generation
│       ├── routes/           # /auth/* and /access/*
│       ├── worker/           # Periodic balance re-verification
│       └── index.ts          # Server + worker bootstrap
├── web/                      # Frontend — Next.js + Solana wallet-adapter
│   ├── app/                  # Page, providers, global styles
│   ├── components/           # Globe (animated), BackgroundFX, AccessPanel
│   └── lib/api.ts            # Backend client
├── browser/                  # Desktop browser prototype (Electron + Chromium)
│   └── src/                  # main + preload + UI (tabs, omnibox, tracker blocker)
├── infra/README.md           # How to stand up a real WireGuard server
├── netlify.toml              # Frontend deploy config (static export from web/)
└── docker-compose.yml        # Postgres for production
```

---

## Quickstart (local dev — no token, no VPN server required)

Thanks to `DEV_BYPASS_TOKEN_GATE=true` and the `mock` WireGuard provider, you can try the **whole flow** before you launch the token or own a VPN server.

### 1. Backend

```bash
cd api
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init   # creates the local SQLite DB
npm run dev                             # http://localhost:4000
```

Run the end-to-end smoke test (server must be running):

```bash
npm run smoke
```

### 2. Frontend (in another terminal)

```bash
cd web
cp .env.example .env.local
npm install
npm run dev                             # http://localhost:3000
```

Open **http://localhost:3000**, connect a wallet, sign — and thanks to the dev bypass you'll see the generated (mock) WireGuard config.

---

## Connecting the real token (after the pump.fun launch)

In `api/.env`:

```bash
DEV_BYPASS_TOKEN_GATE=false
TOKEN_MINT=<mint_address_from_pumpfun>
MIN_TOKEN_BALANCE=100000           # how many tokens are required for free VPN
SOLANA_RPC_URL=https://...         # use a dedicated RPC (Helius/QuickNode); public endpoints are rate-limited
```

From then on, access depends on the real on-chain balance. No code changes needed.

---

## Connecting a real WireGuard server

1. Follow [`infra/README.md`](infra/README.md) to stand up a server (Ubuntu + WireGuard).
2. In `api/.env`:

```bash
WIREGUARD_PROVIDER=local              # runs `wg` on this host
WG_SERVER_ENDPOINT=<server_ip>:51820
WG_SERVER_PUBLIC_KEY=<server_public_key>
WG_INTERFACE=wg0
```

> With the `local` provider the backend must run on the **same host** as the WireGuard server (or via a small agent), with permission to run `wg`. For multiple regions, replicate this setup behind a server selector.

---

## Deployment

### Frontend → Netlify (static)

The landing page is a fully static Next.js export (`output: 'export'` in `web/next.config.js`, which makes `next build` emit `web/out/`). The included `netlify.toml` already points Netlify at the `web/` subfolder:

```toml
[build]
  base = "web"
  command = "npm run build"
  publish = "out"
```

Connect the repo in Netlify and deploy — no extra settings needed. To preview the static build locally:

```bash
npx serve web/out
```

When the backend is hosted, set `NEXT_PUBLIC_API_URL` in Netlify (Site settings → Environment variables) to the backend's public URL so the wallet flow can reach it.

### Backend → VPS

The backend runs through `tsx` (no compile step). Host it on the same machine as WireGuard (provider `local`) or next to a WireGuard agent, provide the env vars from `.env.example`, then:

```bash
npm start            # = tsx src/index.ts
```

---

## Switching to Postgres (production)

1. In `api/prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. In `api/.env`, set `DATABASE_URL=postgresql://soltech:soltech@localhost:5432/soltech?schema=public`.
3. Start the DB with `docker compose up -d` (uses the included `docker-compose.yml`) and run `npm run prisma:migrate`.

---

## Security notes (to address before a public launch)

- **WireGuard private keys**: in this MVP the server generates the client key and stores it so it can re-display the config. It's convenient but not ideal. Next step: generate the key **on the user's device** and send only the public key. → see roadmap.
- **Privacy / no-logs**: access is tied to an on-chain wallet, but VPN *traffic* must not be linkable to the wallet. Keep access data separate from session data.
- **Config sharing**: limit peers per wallet and concurrent connections so one person can't share access.
- **Abuse / legal**: an exit node means handling abuse reports (DMCA, etc.). Plan for it before opening to the public.
- Use a long, random `JWT_SECRET` in production.

---

## Roadmap (the "features" to define)

- [ ] Server selection / multi-region
- [ ] Access tiers based on how many tokens are held (hold more → more servers/bandwidth)
- [ ] Client-side key generation (privacy)
- [ ] Config QR code + branded desktop/mobile app
- [ ] Device and concurrent-connection limits
- [ ] Dashboard: uptime, bandwidth, peer status
- [ ] Optional payments/staking for users who'd rather not hold
```
