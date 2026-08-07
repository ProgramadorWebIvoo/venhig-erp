import type { Request, Response } from "express";
import { z } from "zod";
import { ItemType } from "@prisma/client";
import { prisma } from "../config/prisma";

const productSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  presentation: z.string().min(1),
  itemType: z.nativeEnum(ItemType).default(ItemType.PFinal),
  cost: z.number().nonnegative(),
  profitMargin: z.number().min(0).max(10),
  price: z.number().nonnegative(),
  priceListNumber: z.number().int().min(1).max(50).default(1),
  stock: z.number().nonnegative().default(0),
  reorderPoint: z.number().nonnegative().default(0),
});

const updateProductSchema = productSchema.partial();

const bulkProductItemSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  presentation: z.string().optional().default("UN"),
  itemType: z.nativeEnum(ItemType).optional().default(ItemType.PFinal),
  cost: z.union([z.number(), z.string()]).optional().default(0).transform((v) => Number(v) || 0),
  profitMargin: z.union([z.number(), z.string()]).optional().default(0).transform((v) => Number(v) || 0),
  price: z.union([z.number(), z.string()]).optional().default(0).transform((v) => Number(v) || 0),
  priceListNumber: z.union([z.number(), z.string()]).optional().default(1).transform((v) => Math.round(Number(v)) || 1),
  stock: z.union([z.number(), z.string()]).optional().default(0).transform((v) => Number(v) || 0),
  reorderPoint: z.union([z.number(), z.string()]).optional().default(0).transform((v) => Number(v) || 0),
});

// El vendedor SÍ puede listar productos (necesita el catálogo para vender),
// pero la respuesta no oculta nada aquí porque el control real de "quién puede
// escribir" ocurre en las rutas de escritura, protegidas con requireRole(ADMIN).
// Si más adelante se quiere ocultar el costo/margen a los vendedores, se filtra
// aquí según req.user.role antes de responder.
export async function listProducts(req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { description: "asc" },
  });

  if (req.user?.role === "VENDEDOR") {
    // El vendedor ve precio y existencia (los necesita para vender),
    // pero no el costo ni el margen — esa es información gerencial.
    const sanitized = products.map(({ cost: _cost, profitMargin: _profitMargin, ...rest }) => rest);
    return res.json(sanitized);
  }

  res.json(products);
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({ data });
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const data = updateProductSchema.parse(req.body);
  const product = await prisma.product.update({ where: { id: req.params.id }, data });
  res.json(product);
}

export async function deactivateProduct(req: Request, res: Response) {
  await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
  res.status(204).send();
}

export async function createProductsBulk(req: Request, res: Response) {
  const productsInput = z.array(bulkProductItemSchema).parse(req.body.products);

  let createdCount = 0;
  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of productsInput) {
      const existing = await tx.product.findUnique({
        where: { code: item.code },
      });

      const data = {
        description: item.description,
        presentation: item.presentation,
        itemType: item.itemType,
        cost: item.cost,
        profitMargin: item.profitMargin,
        price: item.price,
        priceListNumber: item.priceListNumber,
        stock: item.stock,
        reorderPoint: item.reorderPoint,
        active: true, // reactiva si estaba inactivo
      };

      if (existing) {
        await tx.product.update({
          where: { id: existing.id },
          data,
        });
        updatedCount++;
      } else {
        await tx.product.create({
          data: {
            code: item.code,
            ...data,
          },
        });
        createdCount++;
      }
    }
  });

  res.json({ success: true, createdCount, updatedCount });
}
