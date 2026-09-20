import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { createPurchase, createRepackRule, createSupplier, executeRepack, listPurchases, listRepackRules, listSuppliers, updateSupplier } from "../controllers/procurement.controller";

export const procurementRouter = Router();
procurementRouter.use(requireAuth, requireRole(Role.ADMIN, Role.COMPRAS));
procurementRouter.get("/suppliers", listSuppliers);
procurementRouter.post("/suppliers", createSupplier);
procurementRouter.put("/suppliers/:id", updateSupplier);
procurementRouter.get("/purchases", listPurchases);
procurementRouter.post("/purchases", createPurchase);
procurementRouter.get("/repack-rules", listRepackRules);
procurementRouter.post("/repack-rules", createRepackRule);
procurementRouter.post("/repack-rules/:id/execute", executeRepack);