import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";

interface Warehouse { id: string; code: string; name: string; stocks: { id: string; quantity: string; product: { code: string; description: string } }[]; }

export function Warehouses() {
  const [items, setItems] = useState<Warehouse[]>([]); const [form, setForm] = useState({ code: "", name: "" }); const [error, setError] = useState<string | null>(null);
  async function load() { try { setItems((await api.get<Warehouse[]>("/settings/warehouses")).data); } catch (e) { setError(getApiErrorMessage(e)); } }
  useEffect(() => { load(); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); try { await api.post("/settings/warehouses", form); setForm({ code: "", name: "" }); await load(); } catch (e) { setError(getApiErrorMessage(e)); } }
  return <div className="max-w-5xl mx-auto p-6"><h1 className="text-xl font-bold mb-4">Almacenes y existencias</h1>{error && <div className="mb-4 text-red-700 bg-red-50 p-2 rounded">{error}</div>}<form onSubmit={save} className="bg-white rounded-lg shadow p-4 flex gap-2 mb-5"><input required placeholder="Código" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="border rounded px-2 py-2" /><input required placeholder="Nombre del almacén" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border rounded px-2 py-2 flex-1" /><button className="bg-brand-700 text-white px-4 rounded">Crear</button></form>{items.map(w => <section key={w.id} className="bg-white rounded-lg shadow mb-4 p-4"><h2 className="font-bold">{w.code} · {w.name}</h2><div className="mt-2 text-sm text-gray-600">{w.stocks.length ? w.stocks.map(s => <div key={s.id} className="flex justify-between border-t py-1"><span>{s.product.code} · {s.product.description}</span><span>{s.quantity}</span></div>) : "Sin existencias asignadas"}</div></section>)}</div>;
}