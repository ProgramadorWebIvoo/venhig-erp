import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

const prisma = new PrismaClient();

interface SeedData {
  products: {
    code: string;
    description: string;
    presentation: string;
    itemType: "MP" | "PPrinc" | "PSecun" | "PFinal";
    cost: number;
    profitMargin: number;
    price: number;
    priceListNumber: number;
    stock: number;
    reorderPoint: number;
  }[];
  clients: {
    taxId: string;
    name: string;
    address: string | null;
    phone: string | null;
    instagram: string | null;
    email: string | null;
  }[];
}

async function main() {
  // --- Usuarios base ---
  // ⚠️ Cambia estas contraseñas inmediatamente después del primer login.
  const adminPasswordHash = await bcrypt.hash("Admin#2026", 12);
  const comprasPasswordHash = await bcrypt.hash("Compras#2026", 12);
  const vendedorPasswordHash = await bcrypt.hash("Vendedor#2026", 12);

  await prisma.user.upsert({
    where: { email: "admin@tuempresa.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@tuempresa.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "compras@tuempresa.com" },
    update: {},
    create: {
      name: "Compras Demo",
      email: "compras@tuempresa.com",
      passwordHash: comprasPasswordHash,
      role: Role.COMPRAS,
    },
  });

  await prisma.user.upsert({
    where: { email: "vendedor@tuempresa.com" },
    update: {},
    create: {
      name: "Vendedor Demo",
      email: "vendedor@tuempresa.com",
      passwordHash: vendedorPasswordHash,
      role: Role.VENDEDOR,
    },
  });

  console.log("✅ Usuarios base creados (admin@tuempresa.com / compras@tuempresa.com / vendedor@tuempresa.com)");

  // --- Tasa de cambio inicial (ajústala a la del día real) ---
  await prisma.exchangeRate.create({ data: { rateBcv: 100 } });

  // --- Datos importados del Excel (si existe el archivo generado por import_from_excel.py) ---
  const seedDataPath = path.join(__dirname, "seed-data.json");
  if (fs.existsSync(seedDataPath)) {
    const data: SeedData = JSON.parse(fs.readFileSync(seedDataPath, "utf-8"));

    for (const product of data.products) {
      await prisma.product.upsert({
        where: { code: product.code },
        update: {},
        create: product,
      });
    }
    console.log(`✅ ${data.products.length} productos importados del Excel`);

    for (const client of data.clients) {
      await prisma.client.upsert({
        where: { taxId: client.taxId },
        update: {},
        create: client,
      });
    }
    console.log(`✅ ${data.clients.length} clientes importados del Excel`);
  } else {
    console.log("ℹ️  No se encontró prisma/seed-data.json — corre scripts/import_from_excel.py primero si quieres importar tu catálogo real.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
