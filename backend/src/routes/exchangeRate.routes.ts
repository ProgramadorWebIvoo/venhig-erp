import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { getCurrentRate, listRateHistory, setRate } from "../controllers/exchangeRate.controller";

export const exchangeRateRouter = Router();

exchangeRateRouter.use(requireAuth);
exchangeRateRouter.get("/current", getCurrentRate);
exchangeRateRouter.get("/history", listRateHistory);
exchangeRateRouter.post("/", requireRole(Role.ADMIN), setRate);
