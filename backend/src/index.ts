import express from "express";
import cors from "cors";
import path from "node:path";
import "express-async-errors"; // permite `throw` dentro de async handlers sin try/catch manual
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { productsRouter } from "./routes/products.routes";
import { clientsRouter } from "./routes/clients.routes";
import { salesRouter } from "./routes/sales.routes";
import { exchangeRateRouter } from "./routes/exchangeRate.routes";
import { reportsRouter } from "./routes/reports.routes";
import { procurementRouter } from "./routes/procurement.routes";
import { settingsRouter } from "./routes/settings.routes";
import { errorHandler } from "./middleware/errorHandler";
import { verifyMailer } from "./utils/mailer";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "../public")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/exchange-rate", exchangeRateRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/procurement", procurementRouter);
app.use("/api/settings", settingsRouter);

// 3. Opcional: Si tu backend también sirve un frontend de una sola página (SPA)
// esto redirige cualquier otra ruta desconocida al index.html dentro de public
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
