import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { ApiError } from "../middleware/errorHandler";

const rateSchema = z.object({
  rateBcv: z.number().positive(),
});

// La tasa vigente es la más reciente registrada. Cualquier usuario la puede
// consultar (la necesita para calcular el equivalente en Bs al vender),
// pero solo ADMIN puede registrar una nueva (ver rutas).
export async function getCurrentRate(_req: Request, res: Response) {
  let rate = await prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } });

  const today = new Date();
  const isToday =
    rate &&
    rate.date.getDate() === today.getDate() &&
    rate.date.getMonth() === today.getMonth() &&
    rate.date.getFullYear() === today.getFullYear();

  if (!isToday) {
    try {
      const response = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      if (response.ok) {
        const data: any = await response.json();
        const rateBcv = Number(data.promedio);
        if (rateBcv > 0) {
          rate = await prisma.exchangeRate.create({ data: { rateBcv } });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch official BCV rate from dolarapi, falling back to database:", err);
    }
  }

  if (!rate) {
    throw new ApiError(404, "No hay tasa de cambio registrada todavía");
  }
  res.json(rate);
}

export async function setRate(req: Request, res: Response) {
  const { rateBcv } = rateSchema.parse(req.body);
  const rate = await prisma.exchangeRate.create({ data: { rateBcv } });
  res.status(201).json(rate);
}

export async function listRateHistory(_req: Request, res: Response) {
  const rates = await prisma.exchangeRate.findMany({ orderBy: { date: "desc" }, take: 30 });
  res.json(rates);
}
