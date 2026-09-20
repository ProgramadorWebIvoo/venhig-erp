import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";

const emptyForm = { companyName: "", companyTaxId: "", controlNumber: "1", authorization: "", rangeFrom: "", rangeTo: "" };

export function Fiscal() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api.get("/settings/fiscal")
      .then(({ data }) => setForm({ companyName: data.companyName || "", companyTaxId: data.companyTaxId || "", controlNumber: String(data.controlNumber), authorization: data.authorization || "", rangeFrom: data.rangeFrom ? String(data.rangeFrom) : "", rangeTo: data.rangeTo ? String(data.rangeTo) : "" }))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api.put("/settings/fiscal", { companyName: form.companyName, companyTaxId: form.companyTaxId, controlNumber: Number(form.controlNumber), authorization: form.authorization || undefined, rangeFrom: form.rangeFrom ? Number(form.rangeFrom) : undefined, rangeTo: form.rangeTo ? Number(form.rangeTo) : undefined });
      setNotice("Configuración fiscal guardada.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return <div className="max-w-2xl mx-auto p-6 space-y-6"><div><h1 className="text-xl font-bold">Configuración fiscal</h1><p className="text-sm text-slate-400 mt-1">Datos que identifican a la empresa en la facturación.</p></div>{error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</div>}{notice && <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">{notice}</div>}<form onSubmit={save} className="bg-slate-900 border border-white/5 rounded-lg shadow-xl p-5 space-y-4"><section className="space-y-3"><div className="border-b border-white/10 pb-3"><h2 className="font-semibold text-slate-100">Identidad de la empresa</h2><p className="text-xs text-slate-500 mt-1">Se precarga desde COMPANY_NAME y COMPANY_TAX_ID.</p></div><Field label="Razón social"><input required value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} className="w-full border rounded-md px-3 py-2" placeholder="Tu Empresa C.A." /></Field><Field label="RIF / identificación fiscal"><input required value={form.companyTaxId} onChange={(event) => setForm({ ...form, companyTaxId: event.target.value })} className="w-full border rounded-md px-3 py-2" placeholder="J-000000000" /></Field></section><section className="space-y-3 border-t border-white/10 pt-4"><div className="border-b border-white/10 pb-3"><h2 className="font-semibold text-slate-100">Numeración fiscal</h2></div><Field label="Nº de control"><input required type="number" min="0" value={form.controlNumber} onChange={(event) => setForm({ ...form, controlNumber: event.target.value })} className="w-full border rounded-md px-3 py-2" /></Field><Field label="Autorización"><input value={form.authorization} onChange={(event) => setForm({ ...form, authorization: event.target.value })} className="w-full border rounded-md px-3 py-2" /></Field><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Rango desde"><input type="number" value={form.rangeFrom} onChange={(event) => setForm({ ...form, rangeFrom: event.target.value })} className="w-full border rounded-md px-3 py-2" /></Field><Field label="Rango hasta"><input type="number" value={form.rangeTo} onChange={(event) => setForm({ ...form, rangeTo: event.target.value })} className="w-full border rounded-md px-3 py-2" /></Field></div></section><div className="flex justify-end pt-2"><button type="submit" disabled={loading || saving} className="bg-brand-600 hover:bg-brand-500 text-white rounded-md px-4 py-2 font-medium transition disabled:opacity-50">{saving ? "Guardando..." : "Guardar configuración"}</button></div></form></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm text-slate-300"><span className="block mb-1.5 font-medium">{label}</span>{children}</label>; }