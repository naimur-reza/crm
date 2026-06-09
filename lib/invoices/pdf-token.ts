import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

function getSecret() {
  return (
    process.env.INVOICE_PDF_SECRET ||
    process.env.DATABASE_URL ||
    "development-invoice-pdf-secret"
  );
}

export function createInvoicePdfToken(invoiceId: string) {
  return createHmac("sha256", getSecret()).update(invoiceId).digest("hex");
}

export function verifyInvoicePdfToken(invoiceId: string, token: string | null) {
  if (!token) return false;
  const expected = createInvoicePdfToken(invoiceId);
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  return (
    tokenBuffer.length === expectedBuffer.length &&
    timingSafeEqual(tokenBuffer, expectedBuffer)
  );
}

export function buildInvoicePdfUrl(origin: string, invoiceId: string) {
  const token = createInvoicePdfToken(invoiceId);
  return `${origin}/api/crm/invoices/${invoiceId}/pdf?token=${token}`;
}

export function buildInvoiceShareUrl(origin: string, invoiceId: string) {
  const token = createInvoicePdfToken(invoiceId);
  return `${origin}/invoice/${invoiceId}/${token}`;
}
