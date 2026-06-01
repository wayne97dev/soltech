import { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { checkEligibility } from '../solana';
import {
  generateKeyPair,
  allocateAddress,
  wireguard,
  buildClientConfig,
} from '../wireguard';

export async function accessRoutes(app: FastifyInstance): Promise<void> {
  // Tutte le rotte qui richiedono una sessione valida.
  app.addHook('preHandler', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  // Stato: idoneità + VPN attiva o no.
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

  // Provisioning: se idoneo, crea (o riusa) il peer e restituisce la config.
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

  // Revoca manuale di tutti i peer attivi del wallet.
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
