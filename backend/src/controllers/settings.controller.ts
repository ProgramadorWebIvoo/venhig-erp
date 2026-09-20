import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

const warehouseSchema = z.object({ code: z.string().min(1), name: z.string().min(1) });
const fiscalSchema = z.object({
  companyName: z.string().min(1),
  companyTaxId: z.string().min(1),
  controlNumber: z.number().int().nonnegative(),
  authorization: z.string().optional(),
  rangeFrom: z.number().int().optional(),
  rangeTo: z.number().int().optional(),
});

export async function listWarehouses(_req: Request, res: Response) {
  res.json(await prisma.warehouse.findMany({ where: { active: true }, include: { stocks: { include: { product: true } } }, orderBy: { name: "asc" } }));
}

export async function createWarehouse(req: Request, res: Response) {
  res.status(201).json(await prisma.warehouse.create({ data: warehouseSchema.parse(req.body) }));
}

export async function getFiscalConfig(_req: Request, res: Response) {
  res.json(await prisma.fiscalConfig.upsert({
    where: { id: "default" },
    create: { id: "default", companyName: env.COMPANY_NAME, companyTaxId: env.COMPANY_TAX_ID },
    update: {},
  }));
}

export async function updateFiscalConfig(req: Request, res: Response) {
  res.json(await prisma.fiscalConfig.upsert({ where: { id: "default" }, create: { id: "default", ...fiscalSchema.parse(req.body) }, update: fiscalSchema.parse(req.body) }));
}