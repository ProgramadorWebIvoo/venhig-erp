import "dotenv/config";
import { z } from "zod";

// Falla rápido y con mensaje claro si falta una variable crítica,
// en lugar de descubrirlo a mitad de una petición en producción.
const envSchema = z.object({
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatorio"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener al menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SMTP_HOST: z.string().min(1, "SMTP_HOST es obligatorio"),
  SMTP_PORT: z.string().default("587"),
  SMTP_USER: z.string().min(1, "SMTP_USER es obligatorio"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS es obligatorio"),
  SMTP_FROM: z.string().min(1, "SMTP_FROM es obligatorio"),
  COMPANY_NAME: z.string().default("Mi Empresa"),
  COMPANY_TAX_ID: z.string().default("J-000000000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
