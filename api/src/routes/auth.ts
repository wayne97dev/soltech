import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from '../db';
import { buildSignInMessage, verifySignature } from '../siws';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // 1) The client requests a nonce to sign.
  app.post('/auth/nonce', async (req) => {
    const { wallet } = z.object({ wallet: z.string().min(32) }).parse(req.body);

    const nonce = randomBytes(16).toString('hex');
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.authNonce.create({ data: { wallet, nonce, expiresAt } });

    return { message: buildSignInMessage(wallet, nonce, issuedAt), nonce };
  });

  // 2) The client sends the signed message; we verify it and issue a session (JWT).
  app.post('/auth/verify', async (req, reply) => {
    const { wallet, message, signature } = z
      .object({ wallet: z.string().min(32), message: z.string(), signature: z.string() })
      .parse(req.body);

    const match = message.match(/Nonce: ([a-f0-9]+)/);
    if (!match) return reply.code(400).send({ error: 'no-nonce-in-message' });

    const record = await prisma.authNonce.findFirst({
      where: { wallet, nonce: match[1] },
    });
    if (!record || record.expiresAt < new Date()) {
      return reply.code(401).send({ error: 'nonce-invalid-or-expired' });
    }

    if (!verifySignature(message, signature, wallet)) {
      return reply.code(401).send({ error: 'bad-signature' });
    }

    // One-time nonce: remove every nonce for this wallet.
    await prisma.authNonce.deleteMany({ where: { wallet } });
    await prisma.user.upsert({ where: { wallet }, update: {}, create: { wallet } });

    const token = await reply.jwtSign({ wallet });
    return { token };
  });
}
