import { Fragment, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";
import type { Sale } from "../types";
import { PAYMENT_METHOD_LABELS } from "../types";

export function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Sale[]>("/sales");
      setSales(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePrintPdf(sale: Sale) {
    try {
      const res = await api.get(`/sales/${sale.id}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url);
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError("Error al cargar el PDF");
    }
  }

  async function resendEmail(sale: Sale) {
    setResendingId(sale.id);
    setNotice(null);
    try {
      await api.post(`/sales/${sale.id}/resend-email`);
      setNotice(`Factura #${sale.invoiceNumber} reenviada a ${sale.client.email}`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setResendingId(null);
    }
  }

  async function convertToInvoice(sale: Sale) {
    try {
      await api.post(`/sales/${sale.id}/convert`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Historial de ventas</h1>

      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      {notice && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{notice}</div>}

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2 text-right">Total ($)</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Correo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <Fragment key={sale.id}>
                  <tr className="border-t">
                    <td className="px-4 py-2 font-mono">{sale.documentType === "NOTA_ENTREGA" ? "NE" : "FAC"}-{sale.invoiceNumber}</td>
                    <td className="px-4 py-2">{new Date(sale.date).toLocaleString("es-VE")}</td>
                    <td className="px-4 py-2">{sale.client.name}</td>
                    <td className="px-4 py-2">{sale.seller.name}</td>
                    <td className="px-4 py-2 text-right">${Number(sale.totalUsd).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          sale.status === "PAGADA"
                            ? "bg-green-100 text-green-700"
                            : sale.status === "PENDIENTE"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {sale.emailSentAt ? `Enviada ${new Date(sale.emailSentAt).toLocaleDateString("es-VE")}` : "No enviada"}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                        className="text-brand-700 hover:underline text-xs"
                      >
                        {expandedId === sale.id ? "Ocultar" : "Detalle"}
                      </button>
                      <button onClick={() => handlePrintPdf(sale)} className="text-brand-700 hover:underline text-xs">
                        Ver / Imprimir
                      </button>
                      {sale.client.email && (
                        <button
                          onClick={() => resendEmail(sale)}
                          disabled={resendingId === sale.id}
                          className="text-brand-700 hover:underline text-xs disabled:opacity-50"
                        >
                          {resendingId === sale.id ? "Enviando..." : "Reenviar"}
                        </button>
                      )}
                      {sale.documentType === "NOTA_ENTREGA" && sale.status === "PENDIENTE" && (
                        <button onClick={() => convertToInvoice(sale)} className="text-green-700 hover:underline text-xs">
                          Convertir a factura
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === sale.id && (
                    <tr className="bg-gray-50 border-t">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="text-xs text-gray-500 mb-2">
                          Pago: {PAYMENT_METHOD_LABELS[sale.paymentMethod1]} (${Number(sale.amount1).toFixed(2)})
                          {sale.paymentMethod2 &&
                            ` + ${PAYMENT_METHOD_LABELS[sale.paymentMethod2]} ($${Number(sale.amount2 ?? 0).toFixed(2)})`}
                          {sale.reference && ` · Ref: ${sale.reference}`}
                        </div>
                        <table className="w-full text-xs">
                          <thead className="text-gray-500">
                            <tr>
                              <th className="text-left py-1">Producto</th>
                              <th className="text-right py-1">Cant.</th>
                              <th className="text-right py-1">P.U ($)</th>
                              <th className="text-right py-1">Subtotal ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sale.items.map((item) => (
                              <tr key={item.id} className="border-t border-gray-200">
                                <td className="py-1">{item.product.description}</td>
                                <td className="py-1 text-right">{item.quantity}</td>
                                <td className="py-1 text-right">${Number(item.unitPriceUsd).toFixed(2)}</td>
                                <td className="py-1 text-right">${Number(item.subtotalUsd).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                    Aún no hay ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
