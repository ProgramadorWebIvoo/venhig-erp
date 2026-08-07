export type Role = "ADMIN" | "VENDEDOR";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type ItemType = "MP" | "PPrinc" | "PSecun" | "PFinal";

export interface Product {
  id: string;
  code: string;
  description: string;
  presentation: string;
  itemType: ItemType;
  cost?: string; // el backend lo omite para VENDEDOR
  profitMargin?: string;
  price: string;
  priceListNumber: number;
  stock: string;
  reorderPoint: string;
  active: boolean;
}

export interface Client {
  id: string;
  taxId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  instagram?: string | null;
  email?: string | null;
}

export type PaymentMethod =
  | "EFECTIVO_USD"
  | "EFECTIVO_BS"
  | "PAGO_MOVIL"
  | "ZELLE"
  | "TRANSFERENCIA"
  | "PENDIENTE"
  | "DOTACION"
  | "PRODUCTO_DANADO";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO_USD: "Efectivo $",
  EFECTIVO_BS: "Efectivo Bs",
  PAGO_MOVIL: "Pago móvil",
  ZELLE: "Zelle",
  TRANSFERENCIA: "Transferencia",
  PENDIENTE: "Pendiente por pagar",
  DOTACION: "Dotación",
  PRODUCTO_DANADO: "Producto dañado",
};

export interface SaleItem {
  id: string;
  productId: string;
  product: Product;
  quantity: string;
  unitPriceUsd: string;
  subtotalUsd: string;
}

export interface Sale {
  id: string;
  invoiceNumber: number;
  date: string;
  client: Client;
  seller: { name: string };
  exchangeRate: string;
  subtotalUsd: string;
  ivaUsd: string;
  totalUsd: string;
  totalBs: string;
  paymentMethod1: PaymentMethod;
  amount1: string;
  paymentMethod2?: PaymentMethod | null;
  amount2?: string | null;
  reference?: string | null;
  status: "PENDIENTE" | "PAGADA" | "ANULADA";
  emailSentAt?: string | null;
  items: SaleItem[];
}

export interface ExchangeRate {
  id: string;
  date: string;
  rateBcv: string;
}
