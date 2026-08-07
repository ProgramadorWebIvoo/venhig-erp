import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createSale,
  downloadSalePdf,
  getSale,
  listSales,
  resendSaleEmail,
} from "../controllers/sales.controller";

export const salesRouter = Router();

salesRouter.use(requireAuth);

// Tanto ADMIN como VENDEDOR pueden vender: es la operación central del negocio.
// El control de qué pueden ver (todas las ventas vs. solo las propias) vive
// dentro del controlador, según el rol.
salesRouter.get("/", listSales);
salesRouter.get("/:id", getSale);
salesRouter.get("/:id/pdf", downloadSalePdf);
salesRouter.post("/", createSale);
salesRouter.post("/:id/resend-email", resendSaleEmail);
