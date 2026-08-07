import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";
import type { ExchangeRate, Role } from "../types";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

const emptyForm = { name: "", email: "", password: "", role: "VENDEDOR" as Role };

export function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [newRate, setNewRate] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadUsers() {
    const { data } = await api.get<AppUser[]>("/users");
    setUsers(data);
  }

  async function loadRate() {
    try {
      const { data } = await api.get<ExchangeRate>("/exchange-rate/current");
      setRate(data);
    } catch {
      setRate(null);
    }
  }

  useEffect(() => {
    loadUsers();
    loadRate();
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/users", form);
      setShowForm(false);
      setForm(emptyForm);
      setNotice("Usuario creado correctamente");
      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function toggleActive(user: AppUser) {
    await api.put(`/users/${user.id}`, { active: !user.active });
    await loadUsers();
  }

  async function handleSetRate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/exchange-rate", { rateBcv: Number(newRate) });
      setNewRate("");
      setNotice("Tasa de cambio actualizada");
      await loadRate();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      {notice && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{notice}</div>}

      <section>
        <h2 className="text-lg font-bold mb-3">Tasa de cambio del día</h2>
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Vigente: <span className="font-bold text-gray-900">{rate ? `Bs ${rate.rateBcv}` : "No fijada"}</span>
          </div>
          <form onSubmit={handleSetRate} className="flex items-center gap-2 ml-auto">
            <input
              type="number"
              step="0.0001"
              required
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="Nueva tasa (Bs/$)"
              className="border rounded-md px-2 py-1.5 w-40"
            />
            <button type="submit" className="bg-brand-700 text-white px-3 py-1.5 rounded-md text-sm hover:bg-brand-600">
              Actualizar
            </button>
          </form>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Usuarios</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-brand-700 text-white px-4 py-2 rounded-md text-sm hover:bg-brand-600"
          >
            + Nuevo usuario
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Correo</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.role === "ADMIN" ? "Administrador" : "Vendedor"}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {u.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => toggleActive(u)} className="text-brand-700 hover:underline text-xs">
                      {u.active ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateUser} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="font-bold text-lg mb-4">Nuevo usuario</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Nombre</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Correo</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Contraseña temporal</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="w-full border rounded-md px-2 py-1.5"
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 rounded-md bg-brand-700 text-white hover:bg-brand-600">
                Crear
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
