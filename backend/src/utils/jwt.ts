import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  role: Role;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  // jsonwebtoken@9 tipa `expiresIn` como `number | StringValue` (plantilla literal tipo "8h"),
  // no como `string` genérico. Como la duración viene de una env var validada por Zod
  // (siempre un string en tiempo de ejecución), el cast es seguro aquí.
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
