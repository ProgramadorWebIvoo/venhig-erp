import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import {
  createProduct,
  createProductsBulk,
  deactivateProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../controllers/products.controller";

export const productsRouter = Router();

productsRouter.use(requireAuth);

// Lectura: ADMIN y VENDEDOR (el vendedor necesita ver catálogo y existencia para vender).
productsRouter.get("/", listProducts);
productsRouter.get("/:id", getProduct);

// Escritura: exclusivo ADMIN. Aquí es donde se garantiza que un vendedor
// nunca pueda cambiar precio, costo ni inventario, sin importar qué mande el frontend.
productsRouter.post("/", requireRole(Role.ADMIN), createProduct);
productsRouter.post("/bulk", requireRole(Role.ADMIN), createProductsBulk);
productsRouter.put("/:id", requireRole(Role.ADMIN), updateProduct);
productsRouter.delete("/:id", requireRole(Role.ADMIN), deactivateProduct);
