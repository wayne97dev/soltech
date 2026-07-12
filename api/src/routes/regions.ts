import { FastifyInstance } from 'fastify';
import { publicRegions, browserNodes } from '../regions';

export async function regionRoutes(app: FastifyInstance): Promise<void> {
  // Public: the list of VPN regions (id/name/flag/city — no secrets), so the
  // site can render a region picker before the user signs in.
  app.get('/regions', async () => ({ regions: publicRegions() }));

  // Public: exit nodes for the desktop browser (id/name/flag/proxy). The app
  // fetches this at startup so new countries appear without a new build.
  app.get('/vpn/nodes', async () => ({ nodes: browserNodes() }));
}
