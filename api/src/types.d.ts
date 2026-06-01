import '@fastify/jwt';

// Tipizza il payload del JWT e req.user.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { wallet: string };
    user: { wallet: string };
  }
}
