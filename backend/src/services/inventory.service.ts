import { Prisma } from "@prisma/client";

export async function changeStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: Prisma.Decimal,
  reason: string,
  reference?: string
) {
  const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
  const nextStock = product.stock.plus(quantity);
  if (nextStock.lessThan(0)) {
    throw new Error(`Existencia insuficiente de "${product.description}"`);
  }
  await tx.product.update({ where: { id: productId }, data: { stock: nextStock } });
  await tx.stockMovement.create({ data: { productId, quantity, reason, reference } });
  return nextStock;
}