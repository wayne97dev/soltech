import { FastifyInstance } from 'fastify';
import { publicRegions } from '../regions';

// Public: the list of VPN regions (id/name/flag/city — no secrets), so the
// site can render a region picker before the user signs in.
export async function regionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/regions', async () => ({ regions: publicRegions() }));
}
