import PDFDocument from "pdfkit";

export interface InvoicePdfItem {
  code: string;
  description: string;
  quantity: string;
  unitPriceUsd: string;
  subtotalUsd: string;
}

export interface InvoicePdfData {
  companyName: string;
  companyTaxId: string;
  invoiceNumber: number;
  date: Date;
  clientName: string;
  clientTaxId: string;
  clientAddress?: string | null;
  sellerName: string;
  exchangeRate: string;
  items: InvoicePdfItem[];
  subtotalUsd: string;
  ivaUsd: string;
  totalUsd: string;
  totalBs: string;
  exchangeCurrency?: string;
}

/**
 * Genera el PDF de la factura en memoria (sin tocar disco) y resuelve
 * con el Buffer completo, listo para adjuntar a un correo o servir por HTTP.
 */
export function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(18)
      .text(data.companyName, { continued: false })
      .fontSize(10)
      .text(`RIF: ${data.companyTaxId}`)
      .moveDown();

    doc
      .fontSize(14)
      .text(`FACTURA #${data.invoiceNumber}`, { align: "right" })
      .fontSize(10)
      .text(data.date.toLocaleString("es-VE"), { align: "right" })
      .moveDown();

    doc
      .fontSize(11)
      .text(`Cliente: ${data.clientName}`)
      .text(`RIF/CI: ${data.clientTaxId}`)
      .text(`Dirección: ${data.clientAddress ?? "N/A"}`)
      .text(`Vendedor: ${data.sellerName}`)
      .text(`Tasa de cambio (${data.exchangeCurrency ?? "DOLAR"}): ${data.exchangeRate} Bs`)
      .moveDown();

    // --- Tabla de ítems ---
    const startX = 50;
    let y = doc.y;
    const colWidths = { code: 70, desc: 190, qty: 60, unit: 80, subtotal: 90 };

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Código", startX, y, { width: colWidths.code });
    doc.text("Descripción", startX + colWidths.code, y, { width: colWidths.desc });
    doc.text("Cant.", startX + colWidths.code + colWidths.desc, y, { width: colWidths.qty, align: "right" });
    doc.text("P.U ($)", startX + colWidths.code + colWidths.desc + colWidths.qty, y, { width: colWidths.unit, align: "right" });
    doc.text(
      "Subtotal ($)",
      startX + colWidths.code + colWidths.desc + colWidths.qty + colWidths.unit,
      y,
      { width: colWidths.subtotal, align: "right" }
    );
    doc.font("Helvetica");
    y += 18;
    doc.moveTo(startX, y).lineTo(545, y).stroke();
    y += 6;

    for (const item of data.items) {
      // Calculate max height for this row based on the longest text (usually description)
      const rowHeight = Math.max(
        doc.heightOfString(item.code, { width: colWidths.code }),
        doc.heightOfString(item.description, { width: colWidths.desc }),
        18
      );

      // Si nos pasamos de la página, agregamos una nueva antes de escribir la fila
      if (y + rowHeight > 720) {
        doc.addPage();
        y = 50;
      }

      doc.text(item.code, startX, y, { width: colWidths.code });
      doc.text(item.description, startX + colWidths.code, y, { width: colWidths.desc });
      doc.text(item.quantity, startX + colWidths.code + colWidths.desc, y, { width: colWidths.qty, align: "right" });
      doc.text(item.unitPriceUsd, startX + colWidths.code + colWidths.desc + colWidths.qty, y, { width: colWidths.unit, align: "right" });
      doc.text(
        item.subtotalUsd,
        startX + colWidths.code + colWidths.desc + colWidths.qty + colWidths.unit,
        y,
        { width: colWidths.subtotal, align: "right" }
      );
      
      y += rowHeight + 5; // Aumentamos 'y' según la altura real + padding
    }

    y += 10;
    doc.moveTo(startX, y).lineTo(545, y).stroke();
    y += 10;

    doc.text(`Subtotal: $${data.subtotalUsd}`, 350, y, { width: 195, align: "right" });
    y += 15;
    doc.text(`IVA (16%): $${data.ivaUsd}`, 350, y, { width: 195, align: "right" });
    y += 15;
    doc.font("Helvetica-Bold").text(`TOTAL: $${data.totalUsd} (Bs ${data.totalBs})`, 350, y, { width: 195, align: "right" });

    doc.end();
  });
}
