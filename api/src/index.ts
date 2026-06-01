import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { accessRoutes } from './routes/access';
import { searchRoutes } from './routes/search';
import { downloadRoutes } from './routes/download';
import { startReverifyWorker } from './worker/reverify';

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  // Accept body-less POSTs even when content-type is application/json
  // (e.g. /access/provision, /access/revoke have no body).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    if (!body || body.length === 0) return done(null, undefined);
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error);
    }
  });

  // A lone "*" in CORS_ORIGIN means "allow any origin" (handy for early testing).
  const corsOrigin =
    config.corsOrigin.length === 1 && config.corsOrigin[0] === '*' ? true : config.corsOrigin;
  await app.register(cors, { origin: corsOrigin, credentials: true });
  await app.register(jwt, { secret: config.jwtSecret, sign: { expiresIn: config.jwtTtl } });

  app.get('/health', async () => ({ ok: true, env: config.nodeEnv }));

  await app.register(authRoutes);
  await app.register(accessRoutes);
  await app.register(searchRoutes);
  await app.register(downloadRoutes);

  startReverifyWorker();

  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`unknown0 API listening on :${config.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
