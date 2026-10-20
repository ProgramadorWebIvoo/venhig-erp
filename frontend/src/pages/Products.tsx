import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { api, getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ItemType, Product } from "../types";

function mapHeaders(row: any) {
  const mapped: any = {};
  const lowerKeys: Record<string, string> = {};
  for (const key of Object.keys(row)) {
    lowerKeys[key.toLowerCase().trim()] = key;
  }

  const findValue = (aliases: string[]) => {
    for (const alias of aliases) {
      for (const lowerKey of Object.keys(lowerKeys)) {
        if (lowerKey.includes(alias)) {
          return row[lowerKeys[lowerKey]];
        }
      }
    }
    return undefined;
  };

  mapped.code = findValue(["codigo", "código", "code", "cod"]);
  mapped.description = findValue(["descripcion", "descripción", "description", "desc", "nombre"]);
  mapped.presentation = findValue(["presentacion", "presentación", "presentation", "present"]) ?? "UN";
  mapped.itemType = findValue(["itemtype", "tipo", "clase"]) ?? "PFinal";
  mapped.cost = findValue(["costo", "cost", "valor costo"]) ?? 0;
  mapped.profitMargin = findValue(["margen", "profitmargin", "utilidad"]) ?? 0;
  mapped.price = findValue(["precio", "price"]) ?? 0;
  mapped.priceListNumber = findValue(["n lista", "pricelistnumber", "lista", "nro lista"]) ?? 1;
  mapped.stock = findValue(["existencia", "stock", "cant", "cantidad", "inventario"]) ?? 0;
  mapped.reorderPoint = findValue(["reorden", "reorderpoint", "punto reorden"]) ?? 0;

  return mapped;
}

function parseNum(val?: string | number | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const clean = String(val).replace(",", ".").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function calculatePrice(costInput?: string | number | null, marginInput?: string | number | null): string {
  const cost = parseNum(costInput);
  const margin = parseNum(marginInput);
  if (cost <= 0) return "0.00";
  const finalPrice = cost * (1 + margin / 100);
  return finalPrice.toFixed(2);
}

const emptyForm = {
  code: "",
  description: "",
  presentation: "UN",
  itemType: "PFinal" as ItemType,
  cost: "",
  profitMargin: "30",
  price: "",
  priceListNumber: "1",
  stock: "0",
  reorderPoint: "0",
};

export function Products() {
  const { user, isAdmin } = useAuth();
  const canManage = isAdmin || user?.role === "COMPRAS";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    try {
      const { data } = await api.get<Product[]>("/products");
      setProducts(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    const costNum = parseNum(p.cost);
    const priceNum = parseNum(p.price);
    const rawMargin = Number(p.profitMargin) || 0;

    let displayMargin = "";
    if (costNum > 0 && priceNum >= costNum) {
      displayMargin = (((priceNum - costNum) / costNum) * 100).toFixed(1).replace(/\.0$/, "");
    } else if (rawMargin > 0 && rawMargin <= 10) {
      displayMargin = (rawMargin * 100).toFixed(1).replace(/\.0$/, "");
    } else {
      displayMargin = String(rawMargin);
    }

    setForm({
      code: p.code,
      description: p.description,
      presentation: p.presentation,
      itemType: p.itemType,
      cost: p.cost !== null && p.cost !== undefined ? String(p.cost) : "",
      profitMargin: displayMargin,
      price: p.price !== null && p.price !== undefined ? String(p.price) : "",
      priceListNumber: String(p.priceListNumber || 1),
      stock: String(p.stock ?? 0),
      reorderPoint: String(p.reorderPoint ?? 0),
    });
    setShowForm(true);
  }

  function handleCostChange(newCostStr: string) {
    const cost = parseNum(newCostStr);
    const calcPrice = cost > 0 ? calculatePrice(newCostStr, form.profitMargin) : form.price;
    setForm((prev) => ({
      ...prev,
      cost: newCostStr,
      price: cost > 0 ? calcPrice : prev.price,
    }));
  }

  function handleMarginChange(newMarginStr: string) {
    const cost = parseNum(form.cost);
    const calcPrice = cost > 0 ? calculatePrice(cost, newMarginStr) : form.price;
    setForm((prev) => ({
      ...prev,
      profitMargin: newMarginStr,
      price: cost > 0 ? calcPrice : prev.price,
    }));
  }

  function handlePriceChange(newPriceStr: string) {
    const price = parseNum(newPriceStr);
    const cost = parseNum(form.cost);
    let calcMargin = form.profitMargin;
    if (cost > 0) {
      calcMargin = (((price - cost) / cost) * 100).toFixed(1).replace(/\.0$/, "");
    }
    setForm((prev) => ({
      ...prev,
      price: newPriceStr,
      profitMargin: cost > 0 ? calcMargin : prev.profitMargin,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const marginPct = parseNum(form.profitMargin);
    const normalizedMargin = Number((marginPct / 100).toFixed(4));

    const payload = {
      code: form.code,
      description: form.description,
      presentation: form.presentation,
      itemType: form.itemType,
      cost: parseNum(form.cost),
      profitMargin: normalizedMargin,
      price: parseNum(form.price),
      priceListNumber: Number(form.priceListNumber) || 1,
      stock: parseNum(form.stock),
      reorderPoint: parseNum(form.reorderPoint),
    };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      setShowForm(false);
      await loadProducts();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleDeactivate(p: Product) {
    if (!confirm(`¿Desactivar "${p.description}"? Ya no aparecerá disponible para la venta.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      await loadProducts();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  const filtered = products.filter(
    (p) =>
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  function downloadTemplate() {
    const headers = [
      ["Código", "Descripción", "Presentación", "Tipo", "Costo", "Margen", "Precio", "N Lista", "Existencia", "Punto Reorden"]
    ];
    const sampleData = [
      ["PROD001", "Refresco Coca-Cola 1.5L", "UN", "PFinal", 1.20, 0.30, 1.56, 1, 50, 10],
      ["PROD002", "Harina PAN 1Kg", "UN", "PFinal", 0.90, 0.20, 1.08, 1, 100, 20]
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Productos");
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          throw new Error("El archivo está vacío o no contiene filas de datos.");
        }

        const mapped = json.map((row: any) => mapHeaders(row));
        
        let missingCount = 0;
        for (const item of mapped) {
          if (!item.code || !item.description) {
            missingCount++;
          }
        }

        if (missingCount > 0) {
          setImportError(`El archivo tiene ${missingCount} fila(s) sin Código o Descripción obligatorios.`);
        }

        setParsedProducts(mapped);
      } catch (err: any) {
        setImportError(err.message || "No se pudo leer el archivo Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImportSubmit() {
    setImporting(true);
    setImportError(null);
    try {
      const response = await api.post("/products/bulk", { products: parsedProducts });
      const { createdCount, updatedCount } = response.data;
      setNotice(`Importación completada: ${createdCount} creados, ${updatedCount} actualizados.`);
      setShowImportModal(false);
      await loadProducts();
    } catch (err: any) {
      setImportError(getApiErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Catálogo de productos</h1>
        {canManage && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setParsedProducts([]);
                setImportError(null);
                setShowImportModal(true);
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200 border border-gray-300 font-medium"
            >
              Importar Excel
            </button>
            <button onClick={openCreate} className="bg-brand-700 text-white px-4 py-2 rounded-md text-sm hover:bg-brand-600">
              + Nuevo producto
            </button>
          </div>
        )}
      </div>

      {!canManage && (
        <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Estás viendo el catálogo en modo lectura. Solo un administrador puede modificar precios, costos o existencia.
        </div>
      )}

      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      {notice && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{notice}</div>}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por código o descripción..."
        className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
      />

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Present.</th>
                <th className="px-4 py-2 text-right">Precio ($)</th>
                <th className="px-4 py-2 text-right">Existencia</th>
                {canManage && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{p.code}</td>
                  <td className="px-4 py-2">{p.description}</td>
                  <td className="px-4 py-2">{p.presentation}</td>
                  <td className="px-4 py-2 text-right">${Number(p.price).toFixed(2)}</td>
                  <td
                    className={`px-4 py-2 text-right ${
                      Number(p.stock) <= Number(p.reorderPoint) ? "text-red-600 font-semibold" : ""
                    }`}
                  >
                    {p.stock}
                  </td>
                  {canManage && (
                    <td className="px-4 py-2 text-right space-x-2">
                      <button onClick={() => openEdit(p)} className="text-brand-700 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDeactivate(p)} className="text-red-600 hover:underline">
                        Desactivar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-gray-400">
                    No hay productos que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && isAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h2 className="font-bold text-lg mb-4">{editing ? "Editar producto" : "Nuevo producto"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Código</label>
                <input
                  required
                  disabled={!!editing}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5 disabled:bg-gray-100"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Descripción</label>
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Presentación</label>
                <input
                  required
                  value={form.presentation}
                  onChange={(e) => setForm({ ...form, presentation: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Tipo</label>
                <select
                  value={form.itemType}
                  onChange={(e) => setForm({ ...form, itemType: e.target.value as ItemType })}
                  className="w-full border rounded-md px-2 py-1.5"
                >
                  <option value="MP">Materia prima</option>
                  <option value="PPrinc">Producto principal</option>
                  <option value="PSecun">Producto secundario</option>
                  <option value="PFinal">Producto final</option>
                </select>
              </div>
              <div className="col-span-2 bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 my-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    📈 Margen Comercial y Precio Final
                  </span>
                  {parseNum(form.cost) > 0 && parseNum(form.price) >= parseNum(form.cost) && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Ganancia: +${(parseNum(form.price) - parseNum(form.cost)).toFixed(2)} USD
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Costo ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.cost}
                      placeholder="0.00"
                      onChange={(e) => handleCostChange(e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 font-mono text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-emerald-900 block mb-1">Margen Ganancia (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.profitMargin}
                      placeholder="30"
                      onChange={(e) => handleMarginChange(e.target.value)}
                      className="w-full border-2 border-emerald-400 rounded-md px-2 py-1.5 font-mono text-sm font-semibold text-emerald-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-900 block mb-1">
                      Precio Final ($) <span className="text-[10px] text-emerald-600 font-bold ml-1">⚡ Auto</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.price}
                      placeholder="0.00"
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="w-full border-2 border-emerald-500 rounded-md px-2 py-1.5 font-mono text-sm font-bold text-gray-900 bg-white shadow-xs"
                    />
                  </div>
                </div>
                {parseNum(form.cost) > 0 ? (
                  <p className="text-[11px] text-emerald-700 mt-2 font-mono">
                    ✓ Cálculo automático: ${parseNum(form.cost).toFixed(2)} + {form.profitMargin || 0}% = ${parseNum(form.price).toFixed(2)} USD
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-2 italic">
                    💡 Ingresa el Costo ($) y al modificar el Margen (%) el Precio Final se actualizará automáticamente.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600">N° Lista</label>
                <input
                  type="number"
                  value={form.priceListNumber}
                  onChange={(e) => setForm({ ...form, priceListNumber: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Existencia</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full border rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Punto de reorden</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.reorderPoint}
                  onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
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

      {showImportModal && isAdmin && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-left">Carga masiva de productos</h2>
            <button
              type="button"
              onClick={downloadTemplate}
              className="text-xs text-brand-700 hover:underline font-semibold"
            >
              Descargar plantilla Excel
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand-600 transition bg-gray-50 relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">Haz clic o arrastra un archivo Excel aquí</p>
                <p className="text-xs text-gray-400">Soporta formatos .xlsx y .xls</p>
              </div>
            </div>

            {importError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-left">
                {importError}
              </div>
            )}

            {parsedProducts.length > 0 && (
              <div className="space-y-2 text-left">
                <h3 className="font-bold text-sm text-gray-700">
                  Vista previa de productos a importar ({parsedProducts.length} encontrados)
                </h3>
                <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                      <tr>
                        <th className="px-3 py-2">Código</th>
                        <th className="px-3 py-2">Descripción</th>
                        <th className="px-3 py-2">Present.</th>
                        <th className="px-3 py-2 text-right">Precio ($)</th>
                        <th className="px-3 py-2 text-right">Existencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedProducts.slice(0, 10).map((p, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-600">
                            {p.code || <span className="text-red-500 font-semibold">[FALTA]</span>}
                          </td>
                          <td className="px-3 py-2">
                            {p.description || <span className="text-red-500 font-semibold">[FALTA]</span>}
                          </td>
                          <td className="px-3 py-2">{p.presentation}</td>
                          <td className="px-3 py-2 text-right">${Number(p.price).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{p.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedProducts.length > 10 && (
                  <p className="text-xs text-gray-400 italic">
                    Mostrando los primeros 10 productos del archivo.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 border-t pt-4">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={importing || parsedProducts.length === 0 || !!importError}
              className="px-4 py-2 rounded-md bg-brand-700 text-white hover:bg-brand-600 disabled:opacity-50 font-medium"
            >
              {importing ? "Procesando..." : "Confirmar importación"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
