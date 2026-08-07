import { PrismaClient } from "@prisma/client";

// Singleton: evita agotar el pool de conexiones abriendo un PrismaClient
// nuevo en cada hot-reload durante desarrollo.
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma = global.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
