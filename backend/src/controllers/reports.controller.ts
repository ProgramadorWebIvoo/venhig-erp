import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function getSalesSummary(req: Request, res: Response) {
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;

  const sales = await prisma.sale.findMany({
    where: {
      date: { gte: from, lte: to },
      status: { not: "ANULADA" },
    },
    include: {
      client: true,
      items: { include: { product: true } },
    },
    orderBy: { date: "asc" },
  });

  const totalUsd = sales.reduce((sum, sale) => sum + Number(sale.totalUsd), 0);
  const pendingUsd = sales
    .filter((sale) => sale.status === "PENDIENTE")
    .reduce((sum, sale) => sum + Number(sale.totalUsd), 0);

  const productTotals = new Map<string, { code: string; description: string; quantity: number; revenue: number }>();
  const salesByDay = new Map<string, number>();

  for (const sale of sales) {
    const day = sale.date.toISOString().slice(0, 10);
    salesByDay.set(day, (salesByDay.get(day) ?? 0) + Number(sale.totalUsd));

    for (const item of sale.items) {
      const current = productTotals.get(item.productId) ?? {
        code: item.product.code,
        description: item.product.description,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += Number(item.quantity);
      current.revenue += Number(item.subtotalUsd);
      productTotals.set(item.productId, current);
    }
  }

  res.json({
    totalUsd,
    pendingUsd,
    averageTicketUsd: totalUsd / (sales.length || 1),
    documentCount: sales.length,
    pendingCount: sales.filter((sale) => sale.status === "PENDIENTE").length,
    topProducts: [...productTotals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    salesByDay: [...salesByDay.entries()].map(([date, amountUsd]) => ({ date, amountUsd })),
    receivables: sales
      .filter((sale) => sale.status === "PENDIENTE")
      .map((sale) => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        client: sale.client.name,
        totalUsd: Number(sale.totalUsd),
      })),
  });
}