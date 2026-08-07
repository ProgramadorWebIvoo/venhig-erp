import express from "express";
import cors from "cors";
import "express-async-errors"; // permite `throw` dentro de async handlers sin try/catch manual
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { productsRouter } from "./routes/products.routes";
import { clientsRouter } from "./routes/clients.routes";
import { salesRouter } from "./routes/sales.routes";
import { exchangeRateRouter } from "./routes/exchangeRate.routes";
import { errorHandler } from "./middleware/errorHandler";
import { verifyMailer } from "./utils/mailer";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/exchange-rate", exchangeRateRouter);

// Debe registrarse DESPUÉS de todas las rutas: es el único lugar que traduce
// errores lanzados en cualquier controlador a una respuesta HTTP consistente.
app.use(errorHandler);

const port = Number(env.PORT);

app.listen(port, () => {
  console.log(`✅ API escuchando en http://localhost:${port}`);

  verifyMailer()
    .then(() => console.log("✅ SMTP verificado correctamente"))
    .catch((err) => console.warn("⚠️  No se pudo verificar SMTP (revisa .env):", err.message));
});
