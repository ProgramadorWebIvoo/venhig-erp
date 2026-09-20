import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const items = [
  ["/reportes", "Reportes", "📊", "ADMIN"], ["/", "Nueva venta", "🧾", "ALL"], ["/ventas", "Ventas", "📋", "ALL"],
  ["/productos", "Productos", "📦", "ALL"], ["/clientes", "Clientes", "👥", "ALL"], ["/proveedores", "Proveedores", "🚚", "BACKOFFICE"],
  ["/compras", "Compras", "🛒", "BACKOFFICE"], ["/reempaque", "Reempaque", "🔄", "BACKOFFICE"], ["/aprobaciones", "Aprobaciones", "✅", "ADMIN"],
  ["/usuarios", "Usuarios", "🔑", "ADMIN"], ["/fiscal", "Config. fiscal", "🏛️", "ADMIN"], ["/almacenes", "Almacenes", "🏢", "ADMIN"],
] as const;

export function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  if (!user) return null;
  const visible = items.filter(([, , , access]) => access === "ALL" || (access === "ADMIN" && isAdmin) || (access === "BACKOFFICE" && (isAdmin || user.role === "COMPRAS")));
  return <aside className="w-60 shrink-0 bg-slate-950 min-h-screen flex flex-col border-r border-white/5">
    <div className="px-5 py-5 border-b border-white/5 flex items-center gap-2">
      <span className="text-xl">⚡</span><span className="text-white font-bold text-lg tracking-tight">ERP Ventas</span>
    </div>
    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">{visible.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${isActive ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"}`}><span>{icon}</span><span>{label}</span></NavLink>)}</nav>
    <div className="px-4 py-4 border-t border-white/5 text-white"><div className="text-sm font-medium truncate">{user.name}</div><div className="text-xs text-slate-500 mb-2">{user.role === "ADMIN" ? "Master" : user.role === "COMPRAS" ? "Compras" : "Vendedor"}</div><button onClick={logout} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md text-sm transition">Salir</button></div>
  </aside>;
}