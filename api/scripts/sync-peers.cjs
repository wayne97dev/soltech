/**
 * Re-adds all active DB peers to the WireGuard interface.
 * Use after switching WIREGUARD_PROVIDER from mock to local (or rebuilding the server),
 * so previously provisioned configs keep working.
 *
 *   cd api && node scripts/sync-peers.cjs      (as root, on the VPN host)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('node:child_process');

const iface = process.env.WG_INTERFACE || 'wg0';
const KEY_RE = /^[A-Za-z0-9+/]{43}=$/;

(async () => {
  const prisma = new PrismaClient();
  const peers = await prisma.vpnPeer.findMany({ where: { active: true } });

  let ok = 0;
  for (const p of peers) {
    if (!KEY_RE.test(p.publicKey)) {
      console.warn(`skipping peer with invalid key: ${p.id}`);
      continue;
    }
    const ip = p.address.split('/')[0];
    execSync(`wg set ${iface} peer ${p.publicKey} allowed-ips ${ip}/32`);
    console.log(`synced ${p.publicKey.slice(0, 10)}… -> ${ip}`);
    ok += 1;
  }

  try {
    execSync(`wg-quick save ${iface}`);
  } catch {
    /* non-fatal */
  }
  console.log(`${ok}/${peers.length} active peer(s) synced to ${iface}`);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
