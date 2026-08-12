import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: Number(env.SMTP_PORT) === 465, // 465 = TLS implícito; 587 = STARTTLS
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

interface SendInvoiceEmailParams {
  to: string;
  clientName: string;
  invoiceNumber: number;
  totalUsd: string;
  pdfBuffer: Buffer;
}

export async function sendInvoiceEmail({
  to,
  clientName,
  invoiceNumber,
  totalUsd,
  pdfBuffer,
}: SendInvoiceEmailParams): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `Factura #${invoiceNumber} - ${env.COMPANY_NAME}`,
    text: `Hola ${clientName},\n\nAdjuntamos tu factura #${invoiceNumber} por un total de $${totalUsd}.\n\nGracias por tu compra.\n${env.COMPANY_NAME}`,
    html: `
      <p>Hola ${clientName},</p>
      <p>Adjuntamos tu factura <strong>#${invoiceNumber}</strong> por un total de <strong>$${totalUsd}</strong>.</p>
      <p>Gracias por tu compra.</p>
      <p>${env.COMPANY_NAME}</p>
    `,
    attachments: [
      {
        filename: `factura-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

// Verifica la conexión SMTP al arrancar el servidor
export async function verifyMailer(): Promise<void> {
  await transporter.verify();
  console.log("Servicio de correo SMTP configurado correctamente.");
}
