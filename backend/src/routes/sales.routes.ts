import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createSale,
  downloadSalePdf,
  getSale,
  listSales,
  resendSaleEmail,
  listPriceApprovals,
  decidePriceApproval,
  convertDeliveryNote,
} from "../controllers/sales.controller";
import { requireRole } from "../middleware/role";
import { Role } from "@prisma/client";

export const salesRouter = Router();

salesRouter.use(requireAuth);

// Tanto ADMIN como VENDEDOR pueden vender: es la operación central del negocio.
// El control de qué pueden ver (todas las ventas vs. solo las propias) vive
// dentro del controlador, según el rol.
salesRouter.get("/", listSales);
salesRouter.get("/approvals", requireRole(Role.ADMIN), listPriceApprovals);
salesRouter.patch("/approvals/:id", requireRole(Role.ADMIN), decidePriceApproval);
salesRouter.get("/:id", getSale);
salesRouter.get("/:id/pdf", downloadSalePdf);
salesRouter.post("/", createSale);
salesRouter.post("/:id/resend-email", resendSaleEmail);
salesRouter.post("/:id/convert", convertDeliveryNote);
