import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { getSalesSummary } from "../controllers/reports.controller";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole("ADMIN"));
reportsRouter.get("/summary", getSalesSummary);