import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";
import type { Supplier } from "../types";

export function Suppliers() {
  const [items, setItems] = useState<Supplier[]>([]); const [error, setError] = useState<string | null>(null); const [form, setForm] = useState({ taxId: "", name: "", phone: "", email: "" });
  async function load() { try { setItems((await api.get<Supplier[]>("/procurement/suppliers")).data); } catch (e) { setError(getApiErrorMessage(e)); } }
  useEffect(() => { load(); }, []);
  async function save(e: React.FormEvent) { e.preventDefault(); try { await api.post("/procurement/suppliers", form); setForm({ taxId: "", name: "", phone: "", email: "" }); await load(); } catch (e) { setError(getApiErrorMessage(e)); } }
  return <Page title="Proveedores">{error && <Error text={error} />}<form onSubmit={save} className="bg-white p-4 rounded-lg shadow grid grid-cols-1 md:grid-cols-5 gap-2 mb-5"><input required placeholder="RIF" value={form.taxId} onChange={e => setForm({ ...form, taxId: e.target.value })} className="border rounded px-2 py-2" /><input required placeholder="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border rounded px-2 py-2" /><input placeholder="Teléfono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border rounded px-2 py-2" /><input type="email" placeholder="Correo" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border rounded px-2 py-2" /><button className="bg-brand-700 text-white rounded px-3">Guardar</button></form><Table headers={["RIF", "Nombre", "Teléfono", "Correo"]}>{items.map(s => <tr key={s.id} className="border-t"><td className="px-4 py-2">{s.taxId}</td><td className="px-4 py-2">{s.name}</td><td className="px-4 py-2">{s.phone || "-"}</td><td className="px-4 py-2">{s.email || "-"}</td></tr>)}</Table></Page>;
}

function Page({ title, children }: { title: string; children: React.ReactNode }) { return <div className="max-w-6xl mx-auto p-6"><h1 className="text-xl font-bold mb-4">{title}</h1>{children}</div>; }
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="bg-white rounded-lg shadow overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-100 text-left text-gray-600"><tr>{headers.map(h => <th key={h} className="px-4 py-2">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Error({ text }: { text: string }) { return <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{text}</div>; }