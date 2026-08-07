import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createClient, listClients, updateClient } from "../controllers/clients.controller";

export const clientsRouter = Router();

clientsRouter.use(requireAuth);
clientsRouter.get("/", listClients);
clientsRouter.post("/", createClient);
clientsRouter.put("/:id", updateClient);
