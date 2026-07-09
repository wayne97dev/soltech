import { FastifyInstance } from 'fastify';
import { checkEligibilityCached } from '../chain';
import { config } from '../config';

export async function downloadRoutes(app: FastifyInstance): Promise<void> {
  // Downloads are token-gated: only eligible holders get the links.
  app.addHook('preHandler', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.get('/download', async (req, reply) => {
    const { wallet } = req.user;
    const elig = await checkEligibilityCached(wallet);
    if (!elig.eligible) {
      return reply.code(403).send({ error: 'not-eligible', ...elig });
    }

    return {
      mac: config.downloads.mac || null,
      win: config.downloads.win || null,
      linux: config.downloads.linux || null,
    };
  });
}
