import { useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../api/client";
import type { Client, ExchangeRate, PaymentMethod, Product } from "../types";
import { PAYMENT_METHOD_LABELS } from "../types";

interface CartLine {
  product: Product;
  quantity: number;
}

const IVA_RATE = 0.16;

const emptyClientForm = { taxId: "", name: "", address: "", phone: "", instagram: "", email: "" };

export function SaleNew() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rate, setRate] = useState<ExchangeRate | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);

  const [paymentMethod1, setPaymentMethod1] = useState<PaymentMethod>("EFECTIVO_USD");
  const [amount1, setAmount1] = useState("");
  const [paymentMethod2, setPaymentMethod2] = useState<PaymentMethod | "">("");
  const [amount2, setAmount2] = useState("");
  const [reference, setReference] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientModalError, setClientModalError] = useState<string | null>(null);

  const [lastSale, setLastSale] = useState<{ id: string; invoiceNumber: number } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handlePrintPdf(saleId: string) {
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/sales/${saleId}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError("Error al cargar el PDF");
    } finally {
      setDownloadingPdf(false);
    }
  }

  useEffect(() => {
    api.get<Product[]>("/products").then((r) => setProducts(r.data));
    api.get<Client[]>("/clients").then((r) => setClients(r.data));
    api
      .get<ExchangeRate>("https://ve.dolarapi.com/v1/dolares/oficial")
      .then((r) => setRate(r.data))
      .catch(async () => {
        try {
          const dolarResponse = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
          if (dolarResponse.ok) {
            const dolarData = await dolarResponse.json();
            const tasaBs = Number(dolarData.promedio);
            if (tasaBs > 0) {
              setRate({
                id: "dolarapi",
                date: new Date().toISOString(),
                rateBcv: String(tasaBs),
              });
            } else {
              setRate(null);
            }
          } else {
            setRate(null);
          }
        } catch (e) {
          setRate(null);
        }
      });
  }, []);

  // --- Escáner de código de barras global ---
  useEffect(() => {
    let buffer = "";
    let lastTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Evitar conflictos si hay modales abiertos
      if (showClientModal) return;

      const currentTime = Date.now();
      // Si el tiempo entre teclas es > 50ms, asumimos que es tipeo manual y reseteamos
      if (currentTime - lastTime > 50) {
        buffer = "";
      }

      if (e.key === "Enter" && buffer.length > 2) {
        const product = products.find((p) => p.code === buffer);
        if (product) {
          if (Number(product.stock) > 0) {
            setCart((prev) => {
              const existing = prev.find((l) => l.product.id === product.id);
              if (existing) {
                return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
              }
              return [...prev, { product, quantity: 1 }];
            });
            setError(null);
            setSuccess(`✅ Producto escaneado: ${product.description}`);
            setTimeout(() => setSuccess(null), 3000);
          } else {
            setSuccess(null);
            setError(`❌ Producto escaneado sin stock: ${product.description}`);
            setTimeout(() => setError(null), 3000);
          }
        } else {
          setSuccess(null);
          setError(`❌ Código escaneado no encontrado: ${buffer}`);
          setTimeout(() => setError(null), 3000);
        }
        buffer = "";
        
        // Solo prevenimos el default si realmente lo procesamos rápido como un código
        // para no bloquear el enter en otros inputs como el buscador manual
        const isQuickScan = currentTime - lastTime <= 50;
        if(isQuickScan) e.preventDefault();
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
      lastTime = currentTime;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, showClientModal]);

  const filteredProducts = useMemo(() => {
    if (productSearch.length < 1) return [];
    const q = productSearch.toLowerCase();
    return products
      .filter((p) => p.description.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, productSearch]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase().trim();
    if (!q) return [];
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.taxId.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const subtotal = cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;
  const totalBs = rate ? total * Number(rate.rateBcv) : 0;

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1 }];
    });
    setProductSearch("");
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    setLastSale(null);

    if (!selectedClientId) return setError("Selecciona un cliente");
    if (cart.length === 0) return setError("Agrega al menos un producto");

    setSubmitting(true);
    try {
      const { data } = await api.post("/sales", {
        clientId: selectedClientId,
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        paymentMethod1,
        amount1: Number(amount1 || 0),
        paymentMethod2: paymentMethod2 || undefined,
        amount2: amount2 ? Number(amount2) : undefined,
        reference: reference || undefined,
        sendEmail,
      });

      setSuccess(
        `Venta #${data.sale.invoiceNumber} registrada. ` +
        (data.emailSent ? "Factura enviada por correo." : "No se envió correo (revisa el correo del cliente o el estado SMTP).")
      );
      setLastSale({ id: data.sale.id, invoiceNumber: data.sale.invoiceNumber });
      setCart([]);
      setSelectedClientId("");
      setClientSearch("");
      setAmount1("");
      setAmount2("");
      setReference("");
      const refreshed = await api.get<Product[]>("/products");
      setProducts(refreshed.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientModalError(null);
    setCreatingClient(true);
    try {
      const { data: newClient } = await api.post<Client>("/clients", clientForm);
      setClients((prev) => [...prev, newClient]);
      setSelectedClientId(newClient.id);
      setShowClientModal(false);
      setClientForm(emptyClientForm);
    } catch (err) {
      setClientModalError(getApiErrorMessage(err));
    } finally {
      setCreatingClient(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <h1 className="text-xl font-bold">Nueva venta</h1>

        {!rate && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            No hay tasa de cambio registrada hoy. Un administrador debe fijarla antes de poder facturar.
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-700">Cliente</label>
            {!selectedClientId && (
              <button
                type="button"
                onClick={() => {
                  setClientForm(emptyClientForm);
                  setClientModalError(null);
                  setShowClientModal(true);
                }}
                className="text-xs text-brand-700 hover:underline font-medium"
              >
                + Nuevo cliente
              </button>
            )}
          </div>
          {selectedClientId ? (
            <div className="flex items-center justify-between mt-1 bg-brand-50 border border-brand-100 rounded-md px-3 py-2">
              <span>{clients.find((c) => c.id === selectedClientId)?.name ?? clientSearch}</span>
              <button
                onClick={() => {
                  setSelectedClientId("");
                  setClientSearch("");
                }}
                className="text-sm text-red-600 hover:underline"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Buscar por nombre o RIF/CI..."
                className="w-full border rounded-md px-3 py-2 mt-1"
              />
              {filteredClients.length > 0 && (
                <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedClientId(c.id);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-0"
                    >
                      <div className="text-sm">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.taxId}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">Agregar producto</label>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/></svg>
              Escáner activo
            </span>
          </div>
          <input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar por código o descripción..."
            className="w-full border rounded-md px-3 py-2 mt-1"
          />
          {filteredProducts.length > 0 && (
            <div className="border rounded-md mt-1 max-h-48 overflow-y-auto">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={Number(p.stock) <= 0}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-0 disabled:opacity-40 disabled:cursor-not-allowed flex justify-between"
                >
                  <span>
                    {p.description} <span className="text-xs text-gray-400">({p.code})</span>
                  </span>
                  <span className="text-sm text-gray-600">
                    ${Number(p.price).toFixed(2)} · stock {p.stock}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2 w-24">Cant.</th>
                <th className="px-3 py-2 text-right">P.U ($)</th>
                <th className="px-3 py-2 text-right">Subtotal ($)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((line) => (
                <tr key={line.product.id} className="border-t">
                  <td className="px-3 py-2">{line.product.description}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0.01}
                      max={Number(line.product.stock)}
                      step="any"
                      value={line.quantity}
                      onChange={(e) => updateQuantity(line.product.id, Number(e.target.value))}
                      className="w-20 border rounded-md px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">${Number(line.product.price).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">${(Number(line.product.price) * line.quantity).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => removeLine(line.product.id)} className="text-red-600 hover:underline text-xs">
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                    Aún no has agregado productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="col-span-1">
        <div className="bg-white rounded-lg shadow p-4 sticky top-6 space-y-3">
          <h2 className="font-bold">Resumen</h2>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>IVA (16%)</span>
            <span>${iva.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          {rate && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Equivalente Bs (tasa {rate.rateBcv})</span>
              <span>Bs {totalBs.toFixed(2)}</span>
            </div>
          )}

          <hr />

          <div>
            <label className="text-sm text-gray-600">Forma de pago 1</label>
            <select
              value={paymentMethod1}
              onChange={(e) => setPaymentMethod1(e.target.value as PaymentMethod)}
              className="w-full border rounded-md px-2 py-1.5"
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Monto ($)"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Forma de pago 2 (opcional)</label>
            <select
              value={paymentMethod2}
              onChange={(e) => setPaymentMethod2(e.target.value as PaymentMethod | "")}
              className="w-full border rounded-md px-2 py-1.5"
            >
              <option value="">— Ninguna —</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {paymentMethod2 && (
              <input
                type="number"
                step="0.01"
                placeholder="Monto ($)"
                value={amount2}
                onChange={(e) => setAmount2(e.target.value)}
                className="w-full border rounded-md px-2 py-1.5 mt-1"
              />
            )}
          </div>

          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Referencia (opcional)"
            className="w-full border rounded-md px-2 py-1.5"
          />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Enviar factura por correo al cliente
          </label>

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex flex-col gap-2">
              <span>{success}</span>
              {lastSale && success.includes("registrada") && (
                <button
                  onClick={() => handlePrintPdf(lastSale.id)}
                  disabled={downloadingPdf}
                  className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-md self-start hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 font-medium shadow-sm transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  {downloadingPdf ? "Cargando..." : "Imprimir / Ver PDF"}
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !rate}
            className="w-full bg-brand-700 hover:bg-brand-600 text-white rounded-md py-2 font-medium disabled:opacity-50"
          >
            {submitting ? "Procesando..." : "Confirmar venta"}
          </button>
        </div>
      </div>

      {showClientModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateClientSubmit} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="font-bold text-lg mb-4 text-left">Nuevo cliente</h2>
            {clientModalError && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-left">
                {clientModalError}
              </div>
            )}
            <div className="space-y-3 text-left">
              <div>
                <label className="text-sm text-gray-600 block">RIF o CI</label>
                <input
                  required
                  value={clientForm.taxId}
                  onChange={(e) => setClientForm({ ...clientForm, taxId: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block">Nombre / Razón social</label>
                <input
                  required
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block">Correo (para factura digital)</label>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block">Teléfono</label>
                <input
                  value={clientForm.phone}
                  onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block">Dirección fiscal</label>
                <input
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block">Instagram</label>
                <input
                  value={clientForm.instagram}
                  onChange={(e) => setClientForm({ ...clientForm, instagram: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creatingClient}
                className="px-4 py-2 rounded-md bg-brand-700 text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {creatingClient ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
