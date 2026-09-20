import { useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";
import type { ReportSummary } from "../types";

const emptySummary: ReportSummary = {
  totalUsd: 0,
  pendingUsd: 0,
  averageTicketUsd: 0,
  documentCount: 0,
  pendingCount: 0,
  topProducts: [],
  salesByDay: [],
  receivables: [],
};

const money = (value: number) => `$${value.toFixed(2)}`;

export function Reports() {
  const [summary, setSummary] = useState<ReportSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ReportSummary>("/reports/summary")
      .then(({ data }) => setSummary(data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const maxProductQuantity = useMemo(
    () => Math.max(1, ...summary.topProducts.map((product) => product.quantity)),
    [summary.topProducts]
  );
  const maxDayAmount = useMemo(
    () => Math.max(1, ...summary.salesByDay.map((day) => day.amountUsd)),
    [summary.salesByDay]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard de reportes</h1>
        <p className="text-sm text-gray-500">Resumen calculado desde las ventas registradas.</p>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      {loading ? (
        <p className="text-gray-500">Cargando reporte...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric label="Ventas" value={money(summary.totalUsd)} detail={`${summary.documentCount} documentos`} />
            <Metric label="Pendiente por cobrar" value={money(summary.pendingUsd)} detail={`${summary.pendingCount} documentos`} warning />
            <Metric label="Ticket promedio" value={money(summary.averageTicketUsd)} />
            <Metric label="Productos destacados" value={String(summary.topProducts.length)} detail="top 5 del período" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportPanel title="Productos más vendidos">
              {summary.topProducts.length === 0 ? <Empty /> : summary.topProducts.map((product) => (
                <BarRow key={product.code} label={product.description} value={product.quantity} max={maxProductQuantity} suffix=" unidades" />
              ))}
            </ReportPanel>
            <ReportPanel title="Ventas por día">
              {summary.salesByDay.length === 0 ? <Empty /> : summary.salesByDay.map((day) => (
                <BarRow key={day.date} label={new Date(`${day.date}T00:00:00`).toLocaleDateString("es-VE")} value={day.amountUsd} max={maxDayAmount} suffix="" currency />
              ))}
            </ReportPanel>
          </div>

          <section className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="font-bold px-4 py-3">Cuentas por cobrar</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left text-gray-600">
                <tr><th className="px-4 py-2">Documento</th><th className="px-4 py-2">Cliente</th><th className="px-4 py-2 text-right">Pendiente</th></tr>
              </thead>
              <tbody>
                {summary.receivables.map((sale) => (
                  <tr key={sale.id} className="border-t"><td className="px-4 py-2 font-mono">#{sale.invoiceNumber}</td><td className="px-4 py-2">{sale.client}</td><td className="px-4 py-2 text-right text-amber-700 font-medium">{money(sale.totalUsd)}</td></tr>
                ))}
                {summary.receivables.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No hay cuentas pendientes.</td></tr>}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail?: string; warning?: boolean }) {
  return <div className="bg-white rounded-lg shadow p-4"><div className="text-sm text-gray-500">{label}</div><div className={`text-2xl font-bold mt-1 ${warning ? "text-amber-700" : "text-gray-900"}`}>{value}</div>{detail && <div className="text-xs text-gray-400 mt-1">{detail}</div>}</div>;
}

function ReportPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="bg-white rounded-lg shadow p-4"><h2 className="font-bold mb-3">{title}</h2>{children}</section>;
}

function BarRow({ label, value, max, suffix, currency = false }: { label: string; value: number; max: number; suffix: string; currency?: boolean }) {
  return <div className="mb-3"><div className="flex justify-between gap-3 text-sm"><span className="truncate">{label}</span><span className="font-medium whitespace-nowrap">{currency ? money(value) : `${value}${suffix}`}</span></div><div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-brand-600 rounded-full" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div></div>;
}

function Empty() {
  return <p className="text-sm text-gray-400">Sin datos registrados todavía.</p>;
}