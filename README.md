# ERP Ventas — sistema centralizado de ventas, facturación e inventario

Migración del Excel `Programa_Ventas_-_2026_BORRADOR.xlsm` a una aplicación web real,
multiusuario, con control de roles y envío de facturas digitales por correo.

## Qué resuelve

- **Catálogo centralizado** de productos (precio, costo, inventario, punto de reorden).
- **Clientes y ventas** en base de datos real, no en hojas de cálculo compartidas.
- **Facturación digital**: genera PDF y lo envía por correo automáticamente al cerrar una venta.
- **Roles**:
  - `ADMIN`: acceso total — precios, costos, inventario, usuarios, tasa de cambio, todas las ventas.
  - `VENDEDOR`: puede vender y gestionar clientes, pero **no puede** crear/editar/eliminar productos
    (precio, costo, inventario quedan bloqueados a nivel de backend, no solo ocultos en pantalla).
- **Bimoneda (USD/Bs)**: cada venta usa la tasa BCV vigente, fijada por un admin.

## Stack

- Backend: Node.js + TypeScript + Express + Prisma + PostgreSQL
- Frontend: React + TypeScript + Vite + Tailwind
- Autenticación: JWT
- Correo: Nodemailer (SMTP — Gmail, SendGrid, Mailgun, etc.)
- PDF: PDFKit

## Opción A — Correrlo en local con Docker (recomendado para probar)

Requisito: Docker y Docker Compose instalados.

```bash
# 1. Configura el backend
cp backend/.env.example backend/.env
# Edita backend/.env: como mínimo, pon tus credenciales SMTP reales (SMTP_USER/SMTP_PASS)
# y un JWT_SECRET largo y aleatorio.

# 2. Levanta todo (Postgres + API + Frontend)
docker compose up --build

# 3. Aplica las migraciones y carga los datos iniciales (en otra terminal)
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

Abre `http://localhost:5173`. Usuarios de prueba creados por el seed:

| Rol      | Correo                    | Contraseña      |
|----------|----------------------------|-----------------|
| Admin    | admin@tuempresa.com        | Admin#2026      |
| Vendedor | vendedor@tuempresa.com     | Vendedor#2026   |

⚠️ **Cambia estas contraseñas de inmediato** desde el panel de Usuarios (o crea usuarios nuevos y desactiva estos).

## Opción B — Desarrollo local sin Docker

Requiere Node 20+, PostgreSQL corriendo localmente.

```bash
# Backend
cd backend
cp .env.example .env   # edita DATABASE_URL, SMTP_*, JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev             # http://localhost:4000

# Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## Opción C — Desplegar en producción (Render, Railway, VPS)

El código ya está listo para desplegar tal cual:

1. **Base de datos**: crea una instancia PostgreSQL (Render/Railway/Neon/Supabase tienen plan gratuito).
2. **Backend**: despliega la carpeta `backend/` como servicio web (usa el `Dockerfile` incluido, o el
   comando `npm run build && npm run prisma:migrate && npm start`). Configura las variables de entorno
   de `.env.example` en el panel del proveedor.
3. **Frontend**: despliega `frontend/` como sitio estático (o con su `Dockerfile`/Nginx). Configura
   `VITE_API_URL` apuntando a la URL pública del backend.
4. Corre `npm run seed` una sola vez contra la base de producción para crear el primer usuario admin.

> Nota: `npx prisma generate` necesita descargar el motor de Prisma desde internet la primera vez
> (`binaries.prisma.sh`). Cualquier entorno de build normal (tu máquina, GitHub Actions, Render,
> Railway) tiene acceso a internet completo, así que esto no es un problema fuera de este sandbox.

## Importar tu catálogo real desde el Excel

El archivo que compartiste es un **borrador de plantilla** (solo 2 productos de ejemplo, 0 clientes
cargados). Cuando tengas tu catálogo real completo en `BASE DATOS` y `CLIENTES`:

```bash
cd backend
python3 scripts/import_from_excel.py /ruta/a/tu/Programa_Ventas.xlsm
npm run seed   # vuelve a correr el seed: hace upsert, no duplica lo ya existente
```

## Reglas de negocio importantes que ya están implementadas

- **Bloqueo real de rol**: las rutas `POST/PATCH/DELETE /api/products` exigen `role=ADMIN` en el
  middleware del backend (`requireRole`). Un vendedor que intente forzar la petición vía API directa
  también recibe `403`, no solo un botón oculto en la UI.
- **Inventario atómico**: al crear una venta, el descuento de stock y la asignación del número de
  factura ocurren dentro de una única transacción de base de datos con bloqueo de fila — dos ventas
  simultáneas nunca pisan el mismo número de factura ni sobre-venden un producto.
- **Precio congelado**: el precio unitario se copia a la venta en el momento de facturar, así que
  cambiar el precio de un producto después no altera facturas ya emitidas.
- **Fallo de correo no revierte la venta**: si el envío SMTP falla, la venta queda registrada igual
  y puedes reenviar la factura después desde el historial de ventas.

## Próximos pasos sugeridos (no incluidos en esta primera versión)

- Módulo de compras y proveedores (el schema de referencia ya existía en tu Excel: `COMPRAS`,
  `PROVEEDORES`, `MAESTRO COMPRAS` — se puede añadir siguiendo el mismo patrón que `Sale`/`SaleItem`).
- Reportes/dashboard (ventas por período, productos más vendidos, cuentas por cobrar).
- Notas de entrega separadas de la factura fiscal (tu Excel las maneja como documentos distintos).
- Multi-lista de precios activa por cliente (tu `BASE DATOS` ya trae `N° LISTA`, el modelo lo soporta
  pero falta la UI para elegir lista al vender).

## Estructura del proyecto

```
venhig-erp/
├── docker-compose.yml
├── backend/
│   ├── prisma/schema.prisma      # modelo de datos
│   ├── prisma/seed.ts            # usuarios + datos iniciales
│   ├── scripts/import_from_excel.py
│   └── src/
│       ├── controllers/          # lógica de negocio
│       ├── routes/               # endpoints + permisos por rol
│       ├── middleware/           # auth, roles, errores
│       └── utils/                # JWT, PDF, correo
└── frontend/
    └── src/
        ├── pages/                # Login, Nueva venta, Ventas, Productos, Clientes, Usuarios
        ├── context/AuthContext.tsx
        └── components/           # NavBar, guardas de ruta
```
