import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";

/**
 * Restringe una ruta a uno o más roles. Se usa DESPUÉS de requireAuth.
 * Esta es la barrera real que impide que un vendedor toque precios/inventario:
 * no basta con ocultar el botón en el frontend, el backend también lo bloquea.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permisos para esta acción" });
    }
    return next();
  };
}
