export type Role = "ADMIN" | "COMPRAS" | "VENDEDOR";

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
  documentType: "FACTURA" | "NOTA_ENTREGA";
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

export interface Supplier { id: string; taxId: string; name: string; address?: string | null; phone?: string | null; email?: string | null; }
export interface Purchase { id: string; number: number; date: string; totalUsd: string; reference?: string | null; supplier: Supplier; buyer: { name: string }; items: { productId: string; quantity: string; unitCostUsd: string; product?: Product }[]; }
export interface RepackRule { id: string; parentProductId: string; childProductId: string; childQuantity: string; parentProduct: Product; childProduct: Product; }
export interface PriceApproval { id: string; catalogPrice: string; chargedPrice: string; product: Product; sale: { id: string; invoiceNumber: number; client: Client; seller: { name: string } }; }

export interface ExchangeRate {
  id: string;
  date: string;
  rateBcv: string;
}

export type ExchangeCurrency = "DOLAR" | "EURO";

export interface ExchangeQuotes {
  dolar: number;
  euro: number;
  date: string;
}

export interface ReportSummary {
  totalUsd: number;
  pendingUsd: number;
  averageTicketUsd: number;
  documentCount: number;
  pendingCount: number;
  topProducts: { code: string; description: string; quantity: number; revenue: number }[];
  salesByDay: { date: string; amountUsd: number }[];
  receivables: { id: string; invoiceNumber: number; client: string; totalUsd: number }[];
}
