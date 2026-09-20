import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";
import type { Product, RepackRule } from "../types";

export function Repack() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rules, setRules] = useState<RepackRule[]>([]);
  const [parentProductId, setParentProductId] = useState("");
  const [childProductId, setChildProductId] = useState("");
  const [childQuantity, setChildQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [productResponse, ruleResponse] = await Promise.all([
        api.get<Product[]>("/products"),
        api.get<RepackRule[]>("/procurement/repack-rules"),
      ]);
      setProducts(productResponse.data);
      setRules(ruleResponse.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createRule(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api.post("/procurement/repack-rules", {
        parentProductId,
        childProductId,
        childQuantity: Number(childQuantity),
      });
      setParentProductId("");
      setChildProductId("");
      setChildQuantity("1");
      setNotice("Regla de reempaque creada correctamente.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function executeRule(rule: RepackRule) {
    const quantity = window.prompt(`Cantidad de ${rule.parentProduct.description} a desglosar`, "1");
    if (!quantity) return;
    setError(null);
    setNotice(null);
    setExecutingId(rule.id);
    try {
      await api.post(`/procurement/repack-rules/${rule.id}/execute`, { quantity: Number(quantity) });
      setNotice("Reempaque ejecutado y existencias actualizadas.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setExecutingId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Reempaque</h1>
        <p className="text-sm text-slate-400 mt-1">Define conversiones padre → hijo y ejecútalas sobre el inventario.</p>
      </div>

      {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</div>}
      {notice && <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">{notice}</div>}

      <form onSubmit={createRule} className="bg-slate-900 border border-white/5 rounded-lg shadow-xl p-5 space-y-4">
        <div className="border-b border-white/10 pb-3"><h2 className="font-semibold text-slate-100">Nueva regla</h2><p className="text-xs text-slate-500 mt-1">Ejemplo: un bulto se convierte en 24 unidades.</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Producto padre"><select required value={parentProductId} onChange={(event) => setParentProductId(event.target.value)} className="w-full border rounded-md px-3 py-2"><option value="">Selecciona el origen</option>{products.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.description}</option>)}</select></Field>
          <Field label="Producto hijo"><select required value={childProductId} onChange={(event) => setChildProductId(event.target.value)} className="w-full border rounded-md px-3 py-2"><option value="">Selecciona el destino</option>{products.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.description}</option>)}</select></Field>
          <Field label="Unidades hijo por padre"><input required type="number" min="0.01" step="any" value={childQuantity} onChange={(event) => setChildQuantity(event.target.value)} className="w-full border rounded-md px-3 py-2" /></Field>
        </div>
        <div className="flex justify-end"><button type="submit" disabled={saving} className="bg-brand-600 hover:bg-brand-500 text-white rounded-md px-4 py-2 font-medium transition disabled:opacity-50">{saving ? "Guardando..." : "Crear regla"}</button></div>
      </form>

      <section className="bg-slate-900 border border-white/5 rounded-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10"><h2 className="font-semibold text-slate-100">Reglas activas</h2><p className="text-xs text-slate-500 mt-1">Ejecutar descuenta el padre y suma el producto hijo de forma atómica.</p></div>
        {loading ? <p className="p-5 text-sm text-slate-500">Cargando reglas...</p> : <div className="divide-y divide-white/5">{rules.map((rule) => <div key={rule.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><div className="text-slate-100 font-medium">{rule.parentProduct.description} <span className="text-brand-400">→</span> {rule.childProduct.description}</div><div className="text-xs text-slate-500 mt-1">1 unidad padre produce {rule.childQuantity} unidades hijo</div></div><button onClick={() => executeRule(rule)} disabled={executingId === rule.id} className="self-start sm:self-auto text-sm bg-brand-600 hover:bg-brand-500 text-white rounded-md px-3 py-1.5 transition disabled:opacity-50">{executingId === rule.id ? "Ejecutando..." : "Ejecutar reempaque"}</button></div>)}{rules.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Aún no hay reglas de reempaque.</p>}</div>}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-slate-300"><span className="block mb-1.5 font-medium">{label}</span>{children}</label>;
}