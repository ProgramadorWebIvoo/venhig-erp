import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";
import type { Client } from "../types";

const emptyForm = { taxId: "", name: "", address: "", phone: "", instagram: "", email: "" };

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadClients(q?: string) {
    setLoading(true);
    try {
      const { data } = await api.get<Client[]>("/clients", { params: q ? { q } : undefined });
      setClients(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => loadClients(search || undefined), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      taxId: c.taxId,
      name: c.name,
      address: c.address ?? "",
      phone: c.phone ?? "",
      instagram: c.instagram ?? "",
      email: c.email ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await api.put(`/clients/${editing.id}`, form);
      } else {
        await api.post("/clients", form);
      }
      setShowForm(false);
      await loadClients(search || undefined);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Clientes</h1>
        <button onClick={openCreate} className="bg-brand-700 text-white px-4 py-2 rounded-md text-sm hover:bg-brand-600">
          + Nuevo cliente
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por RIF/CI o nombre..."
        className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
      />

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">RIF/CI</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Teléfono</th>
                <th className="px-4 py-2">Correo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{c.taxId}</td>
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.phone || "—"}</td>
                  <td className="px-4 py-2">{c.email || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => openEdit(c)} className="text-brand-700 hover:underline">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No hay clientes que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="font-bold text-lg mb-4">{editing ? "Editar cliente" : "Nuevo cliente"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">RIF o CI</label>
                <input
                  required
                  disabled={!!editing}
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Nombre / Razón social</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Correo (para factura digital)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Dirección fiscal</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Instagram</label>
                <input
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 rounded-md bg-brand-700 text-white hover:bg-brand-600">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
