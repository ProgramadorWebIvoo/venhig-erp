import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";
import type { Product, Purchase, Supplier } from "../types";

const emptyForm = { supplierId: "", productId: "", quantity: "1", cost: "0", reference: "" };

export function Purchases() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [supplierResponse, productResponse, purchaseResponse] = await Promise.all([
        api.get<Supplier[]>("/procurement/suppliers"),
        api.get<Product[]>("/products"),
        api.get<Purchase[]>("/procurement/purchases"),
      ]);
      setSuppliers(supplierResponse.data);
      setProducts(productResponse.data);
      setPurchases(purchaseResponse.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await api.post("/procurement/purchases", {
        supplierId: form.supplierId,
        reference: form.reference || undefined,
        items: [{ productId: form.productId, quantity: Number(form.quantity), unitCostUsd: Number(form.cost) }],
      });
      setForm(emptyForm);
      setNotice("Compra registrada y existencia actualizada.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Compras</h1>
        <p className="text-sm text-slate-400 mt-1">Registra entradas de mercancía y actualiza el inventario.</p>
      </div>

      {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</div>}
      {notice && <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">{notice}</div>}

      <form onSubmit={submit} className="bg-slate-900 border border-white/5 rounded-lg shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div><h2 className="font-semibold text-slate-100">Nueva compra</h2><p className="text-xs text-slate-500 mt-1">La existencia se incrementa al confirmar.</p></div>
          <span className="text-xs text-slate-500">Entrada de inventario</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Proveedor"><select required value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })} className="w-full border rounded-md px-3 py-2"><option value="">Selecciona un proveedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {supplier.taxId}</option>)}</select></Field>
          <Field label="Producto"><select required value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="w-full border rounded-md px-3 py-2"><option value="">Selecciona un producto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.description}</option>)}</select></Field>
          <Field label="Cantidad"><input required type="number" min="0.01" step="any" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="w-full border rounded-md px-3 py-2" /></Field>
          <Field label="Costo unitario (USD)"><input required type="number" min="0" step="0.01" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} className="w-full border rounded-md px-3 py-2" /></Field>
          <Field label="Referencia (opcional)" className="md:col-span-2"><input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Factura o nota del proveedor" className="w-full border rounded-md px-3 py-2" /></Field>
        </div>

        <div className="flex justify-end pt-2"><button type="submit" disabled={submitting} className="bg-brand-600 hover:bg-brand-500 text-white rounded-md px-4 py-2 font-medium transition disabled:opacity-50">{submitting ? "Registrando..." : "Registrar compra"}</button></div>
      </form>

      <section className="bg-slate-900 border border-white/5 rounded-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10"><h2 className="font-semibold text-slate-100">Historial de compras</h2><p className="text-xs text-slate-500 mt-1">Últimas entradas registradas.</p></div>
        {loading ? <p className="p-5 text-sm text-slate-500">Cargando compras...</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-950/70 text-left text-slate-400"><tr><th className="px-5 py-3">Nº</th><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Proveedor</th><th className="px-5 py-3">Referencia</th><th className="px-5 py-3 text-right">Total USD</th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id} className="border-t border-white/5"><td className="px-5 py-3 font-mono text-slate-300">{purchase.number}</td><td className="px-5 py-3 text-slate-400">{new Date(purchase.date).toLocaleDateString("es-VE")}</td><td className="px-5 py-3 text-slate-200">{purchase.supplier.name}</td><td className="px-5 py-3 text-slate-400">{purchase.reference || "-"}</td><td className="px-5 py-3 text-right text-slate-200">${Number(purchase.totalUsd).toFixed(2)}</td></tr>)}{purchases.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Aún no hay compras registradas.</td></tr>}</tbody></table></div>}
      </section>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm text-slate-300 ${className}`}><span className="block mb-1.5 font-medium">{label}</span>{children}</label>;
}