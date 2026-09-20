import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-brand-700 text-white" : "text-gray-200 hover:bg-brand-600 hover:text-white"
  }`;

export function NavBar() {
  const { user, logout, isAdmin } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-brand-700 shadow">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="text-white font-bold mr-4">ERP Ventas</span>
          <NavLink to="/" end className={linkClass}>
            Nueva venta
          </NavLink>
          <NavLink to="/ventas" className={linkClass}>
            Ventas
          </NavLink>
          <NavLink to="/productos" className={linkClass}>
            Productos
          </NavLink>
          <NavLink to="/clientes" className={linkClass}>
            Clientes
          </NavLink>
          {isAdmin && (
            <NavLink to="/reportes" className={linkClass}>
              Reportes
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/usuarios" className={linkClass}>
              Usuarios
            </NavLink>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-white">
          <span>
            {user.name} · <span className="opacity-75">{user.role === "ADMIN" ? "Administrador" : "Vendedor"}</span>
          </span>
          <button
            onClick={logout}
            className="bg-brand-600 hover:bg-white hover:text-brand-700 px-3 py-1.5 rounded-md transition"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
