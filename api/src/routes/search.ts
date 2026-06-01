import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { checkEligibilityCached } from '../solana';
import { search } from '../searx';

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  // Search is token-gated, just like the VPN: a valid session is required.
  app.addHook('preHandler', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.get('/search', async (req, reply) => {
    const { q } = z.object({ q: z.string().min(1).max(256) }).parse(req.query);
    const { wallet } = req.user;

    const elig = await checkEligibilityCached(wallet);
    if (!elig.eligible) {
      return reply.code(403).send({ error: 'not-eligible', ...elig });
    }

    try {
      return await search(q);
    } catch {
      return reply.code(502).send({ error: 'search-upstream-failed' });
    }
  });
}
