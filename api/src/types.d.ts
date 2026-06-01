import '@fastify/jwt';

// Types the JWT payload and req.user.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { wallet: string };
    user: { wallet: string };
  }
}
