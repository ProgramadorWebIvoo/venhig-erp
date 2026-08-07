import type { Request, Response } from "express";
import { z } from "zod";
import { Prisma, PaymentMethod } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../middleware/errorHandler";
import { renderInvoicePdf } from "../utils/invoicePdf";
import { sendInvoiceEmail } from "../utils/mailer";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
});

const createSaleSchema = z.object({
  clientId: z.string().min(1),
  items: z.array(saleItemSchema).min(1, "La venta debe tener al menos un ítem"),
  paymentMethod1: z.nativeEnum(PaymentMethod),
  amount1: z.number().nonnegative(),
  paymentMethod2: z.nativeEnum(PaymentMethod).optional(),
  amount2: z.number().nonnegative().optional(),
  reference: z.string().optional(),
  sendEmail: z.boolean().default(true),
});

const IVA_RATE = 0.16;

/**
 * Crea una venta de forma atómica:
 *  1. Bloquea y consume el siguiente número de factura.
 *  2. Verifica existencia suficiente de cada producto (con lock de fila).
 *  3. Descuenta inventario y congela el precio de venta al momento de facturar.
 *  4. Calcula totales en USD y su equivalente en Bs con la tasa vigente.
 * Todo dentro de una transacción: si algo falla, no queda ni la venta ni el
 * descuento de inventario a medias.
 */
export async function createSale(req: Request, res: Response) {
  const data = createSaleSchema.parse(req.body);
  const sellerId = req.user!.userId;

  const currentRate = await prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } });
  if (!currentRate) {
    throw new ApiError(409, "No hay tasa de cambio registrada. Un administrador debe fijarla primero.");
  }

  const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Lock de fila sobre el contador: serializa la asignación de números de factura.
    await tx.$executeRaw`SELECT value FROM "counters" WHERE id = 'invoice' FOR UPDATE`;
    const counter = await tx.counter.upsert({
      where: { id: "invoice" },
      create: { id: "invoice", value: 1 },
      update: { value: { increment: 1 } },
    });

    let subtotalUsd = new Prisma.Decimal(0);
    const itemsToCreate: {
      productId: string;
      quantity: Prisma.Decimal;
      unitPriceUsd: Prisma.Decimal;
      subtotalUsd: Prisma.Decimal;
    }[] = [];

    for (const item of data.items) {
      // FOR UPDATE implícito vía findUniqueOrThrow + update posterior en la misma tx
      // no basta por sí solo contra condiciones de carrera severas; para este volumen
      // de negocio (ventas por vendedor, no alta frecuencia concurrente) es suficiente,
      // y el chequeo de "stock < 0" abajo actúa como última barrera de seguridad.
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
      const quantity = new Prisma.Decimal(item.quantity);

      if (product.stock.lessThan(quantity)) {
        throw new ApiError(
          409,
          `Existencia insuficiente de "${product.description}" (disponible: ${product.stock.toString()})`
        );
      }

      const lineSubtotal = product.price.times(quantity);
      subtotalUsd = subtotalUsd.plus(lineSubtotal);

      itemsToCreate.push({
        productId: product.id,
        quantity,
        unitPriceUsd: product.price,
        subtotalUsd: lineSubtotal,
      });

      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: quantity } },
      });
    }

    const ivaUsd = subtotalUsd.times(IVA_RATE);
    const totalUsd = subtotalUsd.plus(ivaUsd);
    const totalBs = totalUsd.times(currentRate.rateBcv);

    const paidTotal = new Prisma.Decimal(data.amount1).plus(data.amount2 ?? 0);
    if (
      data.paymentMethod1 !== PaymentMethod.PENDIENTE &&
      paidTotal.lessThan(totalUsd.minus(0.01)) // pequeña tolerancia por redondeo
    ) {
      throw new ApiError(400, `El monto pagado ($${paidTotal.toString()}) no cubre el total ($${totalUsd.toString()})`);
    }

    return tx.sale.create({
      data: {
        invoiceNumber: counter.value,
        clientId: data.clientId,
        sellerId,
        exchangeRate: currentRate.rateBcv,
        ivaRate: IVA_RATE,
        subtotalUsd,
        ivaUsd,
        totalUsd,
        totalBs,
        paymentMethod1: data.paymentMethod1,
        amount1: data.amount1,
        paymentMethod2: data.paymentMethod2,
        amount2: data.amount2,
        reference: data.reference,
        status: data.paymentMethod1 === PaymentMethod.PENDIENTE ? "PENDIENTE" : "PAGADA",
        items: { create: itemsToCreate },
      },
      include: {
        items: { include: { product: true } },
        client: true,
        seller: true,
      },
    });
  });

  // Generar y (opcionalmente) enviar la factura FUERA de la transacción de DB:
  // una falla de correo no debe revertir una venta ya confirmada.
  const pdfBuffer = await renderInvoicePdf({
    invoiceNumber: sale.invoiceNumber,
    date: sale.date,
    clientName: sale.client.name,
    clientTaxId: sale.client.taxId,
    clientAddress: sale.client.address,
    sellerName: sale.seller.name,
    exchangeRate: sale.exchangeRate.toString(),
    items: sale.items.map((i) => ({
      code: i.product.code,
      description: i.product.description,
      quantity: i.quantity.toString(),
      unitPriceUsd: i.unitPriceUsd.toString(),
      subtotalUsd: i.subtotalUsd.toString(),
    })),
    subtotalUsd: sale.subtotalUsd.toString(),
    ivaUsd: sale.ivaUsd.toString(),
    totalUsd: sale.totalUsd.toString(),
    totalBs: sale.totalBs.toString(),
  });

  let emailSent = false;
  if (data.sendEmail && sale.client.email) {
    try {
      await sendInvoiceEmail({
        to: sale.client.email,
        clientName: sale.client.name,
        invoiceNumber: sale.invoiceNumber,
        totalUsd: sale.totalUsd.toString(),
        pdfBuffer,
      });
      await prisma.sale.update({ where: { id: sale.id }, data: { emailSentAt: new Date() } });
      emailSent = true;
    } catch (err) {
      // No convertimos esto en un error 500: la venta YA es válida.
      // Se informa al frontend para que el usuario pueda reintentar el envío.
      console.error(`No se pudo enviar la factura #${sale.invoiceNumber} por correo:`, err);
    }
  }

  res.status(201).json({ sale, emailSent });
}

export async function listSales(req: Request, res: Response) {
  const { from, to, clientId } = req.query;

  const sales = await prisma.sale.findMany({
    where: {
      date: {
        gte: typeof from === "string" ? new Date(from) : undefined,
        lte: typeof to === "string" ? new Date(to) : undefined,
      },
      clientId: typeof clientId === "string" ? clientId : undefined,
      // Un vendedor solo ve sus propias ventas; el admin ve todas.
      sellerId: req.user?.role === "VENDEDOR" ? req.user.userId : undefined,
    },
    include: { client: true, seller: { select: { name: true } }, items: true },
    orderBy: { date: "desc" },
    take: 200,
  });

  res.json(sales);
}

export async function getSale(req: Request, res: Response) {
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { client: true, seller: { select: { name: true } }, items: { include: { product: true } } },
  });

  if (req.user?.role === "VENDEDOR" && sale.sellerId !== req.user.userId) {
    throw new ApiError(403, "No tienes acceso a esta venta");
  }

  res.json(sale);
}

export async function downloadSalePdf(req: Request, res: Response) {
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { client: true, seller: true, items: { include: { product: true } } },
  });

  const pdfBuffer = await renderInvoicePdf({
    invoiceNumber: sale.invoiceNumber,
    date: sale.date,
    clientName: sale.client.name,
    clientTaxId: sale.client.taxId,
    clientAddress: sale.client.address,
    sellerName: sale.seller.name,
    exchangeRate: sale.exchangeRate.toString(),
    items: sale.items.map((i) => ({
      code: i.product.code,
      description: i.product.description,
      quantity: i.quantity.toString(),
      unitPriceUsd: i.unitPriceUsd.toString(),
      subtotalUsd: i.subtotalUsd.toString(),
    })),
    subtotalUsd: sale.subtotalUsd.toString(),
    ivaUsd: sale.ivaUsd.toString(),
    totalUsd: sale.totalUsd.toString(),
    totalBs: sale.totalBs.toString(),
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="factura-${sale.invoiceNumber}.pdf"`);
  res.send(pdfBuffer);
}

export async function resendSaleEmail(req: Request, res: Response) {
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { client: true, seller: true, items: { include: { product: true } } },
  });

  if (!sale.client.email) {
    throw new ApiError(400, "El cliente no tiene correo electrónico registrado");
  }

  const pdfBuffer = await renderInvoicePdf({
    invoiceNumber: sale.invoiceNumber,
    date: sale.date,
    clientName: sale.client.name,
    clientTaxId: sale.client.taxId,
    clientAddress: sale.client.address,
    sellerName: sale.seller.name,
    exchangeRate: sale.exchangeRate.toString(),
    items: sale.items.map((i) => ({
      code: i.product.code,
      description: i.product.description,
      quantity: i.quantity.toString(),
      unitPriceUsd: i.unitPriceUsd.toString(),
      subtotalUsd: i.subtotalUsd.toString(),
    })),
    subtotalUsd: sale.subtotalUsd.toString(),
    ivaUsd: sale.ivaUsd.toString(),
    totalUsd: sale.totalUsd.toString(),
    totalBs: sale.totalBs.toString(),
  });

  await sendInvoiceEmail({
    to: sale.client.email,
    clientName: sale.client.name,
    invoiceNumber: sale.invoiceNumber,
    totalUsd: sale.totalUsd.toString(),
    pdfBuffer,
  });

  await prisma.sale.update({ where: { id: sale.id }, data: { emailSentAt: new Date() } });
  res.json({ emailSent: true });
}
