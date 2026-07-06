import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { search } from '../searx';

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  // Public: unknown0 Search is open (instant, no login). The token gate stays on
  // the VPN and the browser download.
  app.get('/search', async (req, reply) => {
    const { q, category } = z
      .object({ q: z.string().min(1).max(256), category: z.string().optional() })
      .parse(req.query);

    try {
      return await search(q, category);
    } catch {
      return reply.code(502).send({ error: 'search-upstream-failed' });
    }
  });
}
