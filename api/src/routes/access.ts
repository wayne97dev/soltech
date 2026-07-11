import { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { checkEligibility } from '../chain';
import { getRegion, defaultRegion, publicRegions } from '../regions';
import {
  generateKeyPair,
  allocateAddress,
  providerForRegion,
  buildClientConfig,
} from '../wireguard';

export async function accessRoutes(app: FastifyInstance): Promise<void> {
  // All routes here require a valid session.
  app.addHook('preHandler', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  // Status: eligibility, the available regions, and which regions are active.
  app.get('/access/status', async (req) => {
    const { wallet } = req.user;
    const elig = await checkEligibility(wallet);
    const user = await prisma.user.findUnique({
      where: { wallet },
      include: { peers: true },
    });
    const activeRegions = (user?.peers ?? []).filter((p) => p.active).map((p) => p.region);

    return {
      wallet,
      eligible: elig.eligible,
      balance: elig.balance,
      required: elig.required,
      reason: elig.reason,
      vpnActive: activeRegions.length > 0,
      regions: publicRegions(),
      activeRegions,
    };
  });

  // Provisioning: if eligible, create (or reuse) the peer for the chosen region
  // and return the config. One active peer per (wallet, region).
  app.post('/access/provision', async (req, reply) => {
    const { wallet } = req.user;
    const body = (req.body ?? {}) as { region?: string };
    const region = body.region ? getRegion(body.region) : defaultRegion();
    if (!region) {
      return reply.code(400).send({ error: 'unknown-region', region: body.region });
    }

    const elig = await checkEligibility(wallet);
    if (!elig.eligible) {
      return reply.code(403).send({ error: 'not-eligible', ...elig });
    }

    const user = await prisma.user.upsert({
      where: { wallet },
      update: {},
      create: { wallet },
      include: { peers: true },
    });

    let peer = user.peers.find((p) => p.active && p.region === region.id) ?? null;
    if (!peer) {
      const keys = generateKeyPair();
      const address = await allocateAddress(region);
      await providerForRegion(region).addPeer(keys.publicKey, address);
      peer = await prisma.vpnPeer.create({
        data: {
          userId: user.id,
          publicKey: keys.publicKey,
          privateKey: keys.privateKey,
          address,
          region: region.id,
        },
      });
    }

    return {
      config: buildClientConfig(region, peer.privateKey, peer.address),
      address: peer.address,
      publicKey: peer.publicKey,
      region: region.id,
    };
  });

  // Manually revoke all of the wallet's active peers (across every region).
  app.post('/access/revoke', async (req) => {
    const { wallet } = req.user;
    const user = await prisma.user.findUnique({
      where: { wallet },
      include: { peers: true },
    });

    for (const p of user?.peers.filter((x) => x.active) ?? []) {
      const region = getRegion(p.region) ?? defaultRegion();
      await providerForRegion(region).removePeer(p.publicKey).catch(() => {});
      await prisma.vpnPeer.update({ where: { id: p.id }, data: { active: false } });
    }
    return { ok: true };
  });
}
