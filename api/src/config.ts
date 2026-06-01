import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),

  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  jwtTtl: process.env.JWT_TTL ?? '7d',

  solanaRpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
  tokenMint: process.env.TOKEN_MINT ?? '',
  minTokenBalance: Number(process.env.MIN_TOKEN_BALANCE ?? '0'),
  devBypassTokenGate: (process.env.DEV_BYPASS_TOKEN_GATE ?? 'false') === 'true',

  wireguard: {
    provider: (process.env.WIREGUARD_PROVIDER ?? 'mock') as 'mock' | 'local',
    endpoint: process.env.WG_SERVER_ENDPOINT ?? 'vpn.example.com:51820',
    serverPublicKey: process.env.WG_SERVER_PUBLIC_KEY ?? '',
    iface: process.env.WG_INTERFACE ?? 'wg0',
    clientSubnet: process.env.WG_CLIENT_SUBNET ?? '10.8.0.0/24',
    dns: process.env.WG_DNS ?? '1.1.1.1',
  },

  reverifyCron: process.env.REVERIFY_CRON ?? '0 * * * *',

  // Search: URL of a self-hosted SearXNG instance. Empty = mock results (dev).
  searxngUrl: process.env.SEARXNG_URL ?? '',

  // Browser installer download URLs (e.g. GitHub Releases). Empty = "coming soon".
  downloads: {
    mac: process.env.DOWNLOAD_MAC ?? '',
    win: process.env.DOWNLOAD_WIN ?? '',
    linux: process.env.DOWNLOAD_LINUX ?? '',
  },
};
