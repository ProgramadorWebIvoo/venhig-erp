import type { JwtPayload } from "../utils/jwt";

// Permite acceder a `req.user` con tipado fuerte en toda la app,
// en vez de castear `any` en cada controlador.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
