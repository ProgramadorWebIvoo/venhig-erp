import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { ApiError } from "../middleware/errorHandler";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Mensaje genérico a propósito: no revelar si fue el correo o la contraseña
  // lo que falló (evita enumeración de usuarios).
  if (!user || !user.active) {
    throw new ApiError(401, "Credenciales inválidas");
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Credenciales inválidas");
  }

  const token = signToken({ userId: user.id, role: user.role, email: user.email });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(user);
}
