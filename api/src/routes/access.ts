import { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { checkEligibility } from '../chain';
import {
  generateKeyPair,
  allocateAddress,
  wireguard,
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

  // Status: eligibility + whether the VPN is active.
  app.get('/access/status', async (req) => {
    const { wallet } = req.user;
    const elig = await checkEligibility(wallet);
    const user = await prisma.user.findUnique({
      where: { wallet },
      include: { peers: true },
    });
    const activePeer = user?.peers.find((p) => p.active) ?? null;

    return {
      wallet,
      eligible: elig.eligible,
      balance: elig.balance,
      required: elig.required,
      reason: elig.reason,
      vpnActive: Boolean(activePeer),
    };
  });

  // Provisioning: if eligible, create (or reuse) the peer and return the config.
  app.post('/access/provision', async (req, reply) => {
    const { wallet } = req.user;

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

    let peer = user.peers.find((p) => p.active) ?? null;
    if (!peer) {
      const keys = generateKeyPair();
      const address = await allocateAddress();
      await wireguard.addPeer(keys.publicKey, address);
      peer = await prisma.vpnPeer.create({
        data: {
          userId: user.id,
          publicKey: keys.publicKey,
          privateKey: keys.privateKey,
          address,
        },
      });
    }

    return {
      config: buildClientConfig(peer.privateKey, peer.address),
      address: peer.address,
      publicKey: peer.publicKey,
    };
  });

  // Manually revoke all of the wallet's active peers.
  app.post('/access/revoke', async (req) => {
    const { wallet } = req.user;
    const user = await prisma.user.findUnique({
      where: { wallet },
      include: { peers: true },
    });

    for (const p of user?.peers.filter((x) => x.active) ?? []) {
      await wireguard.removePeer(p.publicKey).catch(() => {});
      await prisma.vpnPeer.update({ where: { id: p.id }, data: { active: false } });
    }
    return { ok: true };
  });
}
