import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RequireAdmin, RequireAuth } from "./components/RouteGuards";
import RequireRole from "./components/RequireRole";
import { AppShell } from "./components/AppShell";
import { Login } from "./pages/Login";
import { SaleNew } from "./pages/SaleNew";
import { Sales } from "./pages/Sales";
import { Products } from "./pages/Products";
import { Clients } from "./pages/Clients";
import { Users } from "./pages/Users";
import { Reports } from "./pages/Reports";
import { Suppliers } from "./pages/Suppliers";
import { Purchases } from "./pages/Purchases";
import { Repack } from "./pages/Repack";
import { Approvals } from "./pages/Approvals";
import { Fiscal } from "./pages/Fiscal";
import { Warehouses } from "./pages/Warehouses";

function Shell() {
  useAuth();
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/" element={<SaleNew />} />
          <Route path="/ventas" element={<Sales />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/reportes" element={<RequireAdmin><Reports /></RequireAdmin>} />
          <Route path="/usuarios" element={<RequireAdmin><Users /></RequireAdmin>} />
          <Route path="/proveedores" element={<RequireRole roles={["ADMIN", "COMPRAS"]}><Suppliers /></RequireRole>} />
          <Route path="/compras" element={<RequireRole roles={["ADMIN", "COMPRAS"]}><Purchases /></RequireRole>} />
          <Route path="/reempaque" element={<RequireRole roles={["ADMIN", "COMPRAS"]}><Repack /></RequireRole>} />
          <Route path="/aprobaciones" element={<RequireAdmin><Approvals /></RequireAdmin>} />
          <Route path="/fiscal" element={<RequireAdmin><Fiscal /></RequireAdmin>} />
          <Route path="/almacenes" element={<RequireAdmin><Warehouses /></RequireAdmin>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
