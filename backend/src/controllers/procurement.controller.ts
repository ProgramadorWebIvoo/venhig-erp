import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { changeStock } from "../services/inventory.service";

const supplierSchema = z.object({
  taxId: z.string().min(3), name: z.string().min(1), address: z.string().optional(),
  phone: z.string().optional(), email: z.string().email().optional().or(z.literal("")),
});

export async function listSuppliers(_req: Request, res: Response) {
  res.json(await prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }));
}

export async function createSupplier(req: Request, res: Response) {
  const data = supplierSchema.parse(req.body);
  res.status(201).json(await prisma.supplier.create({ data: { ...data, email: data.email || null } }));
}

export async function updateSupplier(req: Request, res: Response) {
  const data = supplierSchema.partial().parse(req.body);
  res.json(await prisma.supplier.update({ where: { id: req.params.id }, data: { ...data, email: data.email || undefined } }));
}

const purchaseSchema = z.object({
  supplierId: z.string().min(1), reference: z.string().optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().positive(), unitCostUsd: z.number().nonnegative() })).min(1),
});

export async function listPurchases(_req: Request, res: Response) {
  res.json(await prisma.purchase.findMany({ include: { supplier: true, items: { include: { product: true } }, buyer: { select: { name: true } } }, orderBy: { date: "desc" }, take: 200 }));
}

export async function createPurchase(req: Request, res: Response) {
  const data = purchaseSchema.parse(req.body);
  const purchase = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT value FROM counters WHERE id = 'purchase' FOR UPDATE`;
    const counter = await tx.counter.upsert({ where: { id: "purchase" }, create: { id: "purchase", value: 1 }, update: { value: { increment: 1 } } });
    let total = new Prisma.Decimal(0);
    const items = [];
    for (const item of data.items) {
      const quantity = new Prisma.Decimal(item.quantity);
      const unitCostUsd = new Prisma.Decimal(item.unitCostUsd);
      const subtotalUsd = quantity.times(unitCostUsd);
      total = total.plus(subtotalUsd);
      await changeStock(tx, item.productId, quantity, "COMPRA", String(counter.value));
      items.push({ productId: item.productId, quantity, unitCostUsd, subtotalUsd });
    }
    return tx.purchase.create({ data: { number: counter.value, supplierId: data.supplierId, buyerId: req.user!.userId, totalUsd: total, reference: data.reference, items: { create: items } }, include: { supplier: true, items: true } });
  });
  res.status(201).json(purchase);
}

const ruleSchema = z.object({ parentProductId: z.string().min(1), childProductId: z.string().min(1), childQuantity: z.number().positive() });

export async function listRepackRules(_req: Request, res: Response) {
  res.json(await prisma.repackRule.findMany({ where: { active: true }, include: { parentProduct: true, childProduct: true }, orderBy: { createdAt: "desc" } }));
}

export async function createRepackRule(req: Request, res: Response) {
  const data = ruleSchema.parse(req.body);
  res.status(201).json(await prisma.repackRule.create({ data }));
}

export async function executeRepack(req: Request, res: Response) {
  const quantity = z.number().positive().parse(req.body.quantity);
  const result = await prisma.$transaction(async (tx) => {
    const rule = await tx.repackRule.findUniqueOrThrow({ where: { id: req.params.id } });
    const parentQuantity = new Prisma.Decimal(quantity).negated();
    await changeStock(tx, rule.parentProductId, parentQuantity, "REEMPAQUE", rule.id);
    await changeStock(tx, rule.childProductId, new Prisma.Decimal(quantity).times(rule.childQuantity), "REEMPAQUE", rule.id);
    return tx.repackExecution.create({ data: { ruleId: rule.id, quantity, executedById: req.user!.userId } });
  });
  res.status(201).json(result);
}