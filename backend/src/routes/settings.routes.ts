import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { createWarehouse, getFiscalConfig, listWarehouses, updateFiscalConfig } from "../controllers/settings.controller";

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireRole(Role.ADMIN));
settingsRouter.get("/warehouses", listWarehouses);
settingsRouter.post("/warehouses", createWarehouse);
settingsRouter.get("/fiscal", getFiscalConfig);
settingsRouter.put("/fiscal", updateFiscalConfig);