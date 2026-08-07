import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { createUser, listUsers, updateUser } from "../controllers/users.controller";

export const usersRouter = Router();

// Toda esta sección es exclusiva de ADMIN: crear vendedores, desactivarlos, etc.
usersRouter.use(requireAuth, requireRole(Role.ADMIN));

usersRouter.get("/", listUsers);
usersRouter.post("/", createUser);
usersRouter.put("/:id", updateUser);
