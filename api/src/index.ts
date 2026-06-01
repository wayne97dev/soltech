import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { accessRoutes } from './routes/access';
import { startReverifyWorker } from './worker/reverify';

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  // Accetta POST senza body anche con content-type application/json
  // (es. /access/provision, /access/revoke che non hanno corpo).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    if (!body || body.length === 0) return done(null, undefined);
    try {
      done(null, JSON.parse(body));
    } catch (err) {
      done(err as Error);
    }
  });

  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(jwt, { secret: config.jwtSecret, sign: { expiresIn: config.jwtTtl } });

  app.get('/health', async () => ({ ok: true, env: config.nodeEnv }));

  await app.register(authRoutes);
  await app.register(accessRoutes);

  startReverifyWorker();

  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`SolTech API in ascolto su :${config.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
