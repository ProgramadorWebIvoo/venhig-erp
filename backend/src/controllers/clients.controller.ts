import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";

const clientSchema = z.object({
  taxId: z.string().min(3),
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

// Cualquier usuario autenticado (admin o vendedor) puede crear/leer clientes:
// un vendedor debe poder registrar un cliente nuevo en el momento de vender.
export async function listClients(req: Request, res: Response) {
  const search = typeof req.query.q === "string" ? req.query.q : undefined;
  const clients = await prisma.client.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } } as any,
            { taxId: { contains: search, mode: "insensitive" } } as any,
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    take: 50,
  });
  res.json(clients);
}

export async function createClient(req: Request, res: Response) {
  const data = clientSchema.parse(req.body);
  const client = await prisma.client.create({ data: { ...data, email: data.email || null } });
  res.status(201).json(client);
}

export async function updateClient(req: Request, res: Response) {
  const data = clientSchema.partial().parse(req.body);
  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: { ...data, email: data.email || undefined },
  });
  res.json(client);
}
