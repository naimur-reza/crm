import "server-only";

import fs from "fs";
import path from "path";
import { eq, sql } from "drizzle-orm";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { getDb } from "@/lib/db";
import {
  clientContacts,
  clients,
  invoiceItems,
  invoices,
  leadContacts,
  leads,
  paymentRecords,
} from "@/lib/db/schema";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 50;
const contentWidth = pageWidth - margin * 2;

function centsToAmount(cents: number | null | undefined) {
  return (cents ?? 0) / 100;
}

function formatNumber(cents: number | null | undefined) {
  const amount = centsToAmount(cents);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatNumberWithSlash(cents: number | null | undefined) {
  return `${formatNumber(cents)}/-`;
}

function money(cents: number | null | undefined) {
  return `${formatNumber(cents)} BDT`;
}

function shortDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date =
    typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
}

export async function getInvoiceDocumentData(invoiceId: string) {
  const [invoice] = await getDb()
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotalCents: invoices.subtotalCents,
      discountCents: invoices.discountCents,
      taxCents: invoices.taxCents,
      totalCents: invoices.totalCents,
      notes: invoices.notes,
      leadId: invoices.leadId,
      clientId: invoices.clientId,
      clientName: clients.name,
      clientWebsite: clients.website,
      clientSource: clients.source,
      leadTitle: leads.title,
      leadCompanyName: leads.companyName,
      paidCents: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int`,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(leads, eq(invoices.leadId, leads.id))
    .leftJoin(paymentRecords, eq(paymentRecords.invoiceId, invoices.id))
    .where(eq(invoices.id, invoiceId))
    .groupBy(
      invoices.id,
      clients.name,
      clients.website,
      clients.source,
      leads.title,
      leads.companyName,
    )
    .limit(1);

  if (!invoice) return null;

  const [items, clientContactRows, leadContactRows] = await Promise.all([
    getDb()
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId)),
    invoice.clientId
      ? getDb()
          .select()
          .from(clientContacts)
          .where(eq(clientContacts.clientId, invoice.clientId))
      : Promise.resolve([]),
    invoice.leadId
      ? getDb()
          .select()
          .from(leadContacts)
          .where(eq(leadContacts.leadId, invoice.leadId))
      : Promise.resolve([]),
  ]);

  const primaryClientContact =
    clientContactRows.find((contact) => contact.isPrimary) ??
    clientContactRows[0];
  const primaryLeadContact =
    leadContactRows.find((contact) => contact.isPrimary) ?? leadContactRows[0];
  const contact = primaryClientContact ?? primaryLeadContact;
  const accountName =
    invoice.clientName ||
    invoice.leadCompanyName ||
    invoice.leadTitle ||
    "Client";

  return {
    invoice,
    items,
    contact,
    accountName,
    balanceCents: Math.max(0, invoice.totalCents - (invoice.paidCents ?? 0)),
    fileName: `${sanitizeFileName(invoice.invoiceNumber)}.pdf`,
  };
}

export async function generateInvoicePdf(
  invoiceId: string,
  publicPdfUrl?: string,
) {
  const data = await getInvoiceDocumentData(invoiceId);
  if (!data) throw new Error("Invoice was not found.");

  const { invoice, items, contact, accountName, balanceCents } = data;
  const doc = await PDFDocument.create();
  const page = doc.addPage([pageWidth, pageHeight]);

  const regular = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const sansRegular = await doc.embedFont(StandardFonts.Helvetica);
  const blue = rgb(0.13, 0.53, 0.8);
  const black = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);
  const darkBlue = rgb(0.1, 0.22, 0.42);
  const tableHeaderBlue = rgb(0, 0, 0);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const totalBg = rgb(0.9, 0.94, 0.97);

  const companyName =
    process.env.COMPANY_INVOICE_NAME || "Company Tools Limited";
  const companyAddress =
    process.env.COMPANY_INVOICE_ADDRESS ||
    "TA-39/1, Lift-6, Gulshan-Badda Link Road, Dhaka-1212, Bangladesh.";
  const companyEmail = process.env.COMPANY_INVOICE_EMAIL || "info@codexaa.com";
  const companyPhone = process.env.COMPANY_INVOICE_PHONE || "+880 1629 557 153";
  const bankDetails =
    process.env.COMPANY_INVOICE_BANK_DETAILS ||
    "Bkash Merchant A/C:\n01901516270";

  const assetsDir = path.join(process.cwd(), "assets");
  const [
    logoBytes,
    sealPaidBytes,
    sealDueBytes,
    sealSignBytes,
    sealCircleBytes,
  ] = await Promise.all([
    fs.promises.readFile(path.join(assetsDir, "logo.png")),
    fs.promises.readFile(path.join(assetsDir, "paid-seal.png")),
    fs.promises.readFile(path.join(assetsDir, "due-seal.png")),
    fs.promises.readFile(path.join(assetsDir, "seal-sign.png")),
    fs.promises.readFile(path.join(assetsDir, "seal-circle.png")),
  ]);
  const logoImage = await doc.embedPng(logoBytes);
  const sealPaidImage = await doc.embedPng(sealPaidBytes);
  const sealDueImage = await doc.embedPng(sealDueBytes);
  const sealSignImage = await doc.embedPng(sealSignBytes);
  const sealCircleImage = await doc.embedPng(sealCircleBytes);

  // Helper to draw text and return the Y after drawing
  function drawText(
    value: string,
    x: number,
    y: number,
    options: {
      size?: number;
      font?: typeof regular;
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
      lineHeight?: number;
    } = {},
  ) {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const color = options.color ?? black;
    const maxWidth = options.maxWidth;
    const lineHeight = options.lineHeight ?? size + 4;
    const words = value.split(/\s+/);
    const lines: string[] = [];
    let current = "";

    if (!maxWidth) {
      page.drawText(value, { x, y, size, font, color });
      return y - lineHeight;
    }

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    lines.forEach((line, index) => {
      page.drawText(line, {
        x,
        y: y - index * lineHeight,
        size,
        font,
        color,
      });
    });
    return y - lines.length * lineHeight;
  }

  // Helper to draw right-aligned text
  function drawRightText(
    value: string,
    rightX: number,
    y: number,
    options: {
      size?: number;
      font?: typeof regular;
      color?: ReturnType<typeof rgb>;
    } = {},
  ) {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const color = options.color ?? black;
    const width = font.widthOfTextAtSize(value, size);
    page.drawText(value, { x: rightX - width, y, size, font, color });
  }

  // ═══════════════════════════════════════════════════
  // ── LOGO (top-left) ──
  // ═══════════════════════════════════════════════════
  const logoW = 80;
  const logoH = 100;
  const logoX = margin;
  const logoY = pageHeight - margin - logoH + 20;
  page.drawImage(logoImage, {
    x: logoX,
    y: logoY,
    width: logoW,
    height: logoH,
  });

  // ── Company name & address (below logo) ──
  let compY = logoY - 16;
  // page.drawText(companyName.toUpperCase(), {
  //   x: margin,
  //   y: compY,
  //   size: 10,
  //   font: sansBold,
  //   color: black,
  // });
  // compY -= 14;

  page.drawText(companyAddress, {
    x: margin,
    y: compY,
    size: 9,
    font: regular,
    color: black,
  });
  compY -= 13;

  // Email as blue link
  page.drawText(companyEmail, {
    x: margin,
    y: compY,
    size: 9,
    font: regular,
    color: blue,
  });
  // Underline for email
  const emailWidth = regular.widthOfTextAtSize(companyEmail, 9);
  page.drawLine({
    start: { x: margin, y: compY - 1.5 },
    end: { x: margin + emailWidth, y: compY - 1.5 },
    thickness: 0.5,
    color: blue,
  });
  compY -= 13;

  page.drawText(companyPhone, {
    x: margin,
    y: compY,
    size: 9,
    font: regular,
    color: black,
  });
  compY -= 13;

  // ═══════════════════════════════════════════════════
  // ── "INVOICE" title (top-right, large italic) ──
  // ═══════════════════════════════════════════════════
  const invoiceTitleSize = 36;
  const invoiceTitleText = "INVOICE";
  const invoiceTitleWidth = italic.widthOfTextAtSize(
    invoiceTitleText,
    invoiceTitleSize,
  );
  page.drawText(invoiceTitleText, {
    x: pageWidth - margin - invoiceTitleWidth,
    y: pageHeight - margin - 30,
    size: invoiceTitleSize,
    font: italic,
    color: darkBlue,
  });

  // ═══════════════════════════════════════════════════
  // ── QR Code (top-right, below INVOICE) ──
  // ═══════════════════════════════════════════════════
  const qrSize = 80;
  const qrX = pageWidth - margin - qrSize;
  const qrY = pageHeight - margin - 40 - qrSize - 5;
  if (publicPdfUrl) {
    const qrDataUrl = await QRCode.toDataURL(publicPdfUrl, {
      margin: 0,
      width: 200,
    });
    const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
    const qrImage = await doc.embedPng(qrBytes);
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  }

  // ═══════════════════════════════════════════════════
  // ── Invoice Meta (right side, below QR) ──
  // ═══════════════════════════════════════════════════
  const metaLabelX = 340;
  const metaColonX = 428;
  const metaValueX = 440;
  let metaY = qrY - 18;

  const terms = invoice.notes || "Subscription";

  const metaItems: [string, string][] = [
    ["Invoice Num", `#${invoice.invoiceNumber}`],
    ["Invoice Date", shortDate(invoice.issueDate)],
    ["Terms", terms],
    ["Due Date", shortDate(invoice.dueDate)],
  ];

  metaItems.forEach(([label, value]) => {
    page.drawText(label, {
      x: metaLabelX,
      y: metaY,
      size: 9,
      font: regular,
      color: black,
    });
    page.drawText(":", {
      x: metaColonX,
      y: metaY,
      size: 9,
      font: regular,
      color: black,
    });

    // Handle multiline values (e.g. long date)
    const words = value.split(" ");
    let line1 = "";
    let line2 = "";
    for (const word of words) {
      const test = line1 ? `${line1} ${word}` : word;
      if (bold.widthOfTextAtSize(test, 9) > 110 && line1) {
        line2 += (line2 ? " " : "") + word;
      } else {
        line1 = test;
      }
    }

    page.drawText(line1, {
      x: metaValueX,
      y: metaY,
      size: 9,
      font: bold,
      color: black,
    });

    if (line2) {
      metaY -= 13;
      page.drawText(line2, {
        x: metaValueX,
        y: metaY,
        size: 9,
        font: bold,
        color: black,
      });
    }

    metaY -= 18;
  });

  // ═══════════════════════════════════════════════════
  // ── ISSUE TO section ──
  // ═══════════════════════════════════════════════════
  let issueY = compY - 18;

  page.drawText("ISSUE TO", {
    x: margin,
    y: issueY,
    size: 10,
    font: sansBold,
  });
  // Underline for ISSUE TO
  const issueToWidth = sansBold.widthOfTextAtSize("ISSUE TO", 10);
  page.drawLine({
    start: { x: margin, y: issueY - 2 },
    end: { x: margin + issueToWidth, y: issueY - 2 },
    thickness: 1,
  });

  issueY -= 22;

  // Company Name
  page.drawText(`Company Name: `, {
    x: margin,
    y: issueY,
    size: 10,
    font: regular,
    color: black,
  });
  const cnLabelW = regular.widthOfTextAtSize("Company Name: ", 10);
  page.drawText(accountName, {
    x: margin + cnLabelW,
    y: issueY,
    size: 10,
    font: bold,
    color: black,
  });
  issueY -= 18;

  // Address
  if (contact?.email) {
    page.drawText("Address:  ", {
      x: margin,
      y: issueY,
      size: 10,
      font: regular,
      color: black,
    });
    const addrLabelW = regular.widthOfTextAtSize("Address:  ", 10);
    page.drawText(contact.email, {
      x: margin + addrLabelW,
      y: issueY,
      size: 10,
      font: regular,
      color: black,
    });
    issueY -= 18;
  }

  // Phone
  if (contact?.phone) {
    page.drawText("Phone: ", {
      x: margin,
      y: issueY,
      size: 10,
      font: regular,
      color: black,
    });
    const phoneLabelW = regular.widthOfTextAtSize("Phone: ", 10);
    page.drawText(contact.phone, {
      x: margin + phoneLabelW,
      y: issueY,
      size: 10,
      font: regular,
      color: black,
    });
    issueY -= 18;
  }

  // ═══════════════════════════════════════════════════
  // ── Items Table ──
  // ═══════════════════════════════════════════════════
  const tableTop = issueY - 20;
  const tableHeaderH = 28;

  // Column positions
  const colSL = margin;
  const colDesc = margin + 40;
  const colQty = margin + 310;
  const colPrice = margin + 370;
  const colAmount = margin + 460;
  const tableRight = pageWidth - margin;

  // Table header background
  page.drawRectangle({
    x: margin,
    y: tableTop - tableHeaderH,
    width: contentWidth,
    height: tableHeaderH,
    color: tableHeaderBlue,
  });

  // Header text
  const headerY = tableTop - tableHeaderH + 9;
  page.drawText("SL", {
    x: colSL + 8,
    y: headerY,
    size: 9,
    font: sansBold,
    color: white,
  });
  page.drawText("Item & Description", {
    x: colDesc + 20,
    y: headerY,
    size: 9,
    font: sansBold,
    color: white,
  });
  page.drawText("Qty", {
    x: colQty,
    y: headerY,
    size: 9,
    font: sansBold,
    color: white,
  });
  page.drawText("Unite Price", {
    x: colPrice,
    y: headerY,
    size: 9,
    font: sansBold,
    color: white,
  });
  page.drawText("Amount", {
    x: colAmount,
    y: headerY,
    size: 9,
    font: sansBold,
    color: white,
  });

  // ── Table Rows ──
  const rowHeight = 28;
  let rowY = tableTop - tableHeaderH;

  items.forEach((item, index) => {
    const cellY = rowY - rowHeight;
    const textY = cellY + 9;

    // Draw bottom border for each row
    page.drawLine({
      start: { x: margin, y: cellY },
      end: { x: tableRight, y: cellY },
      thickness: 0.5,
      color: lightGray,
    });

    // SL number (zero-padded)
    const slNum = String(index + 1).padStart(2, "0");
    page.drawText(slNum, {
      x: colSL + 8,
      y: textY,
      size: 9,
      font: regular,
      color: black,
    });

    // Description
    page.drawText(item.description, {
      x: colDesc + 20,
      y: textY,
      size: 9,
      font: regular,
      color: black,
    });

    // Qty (zero-padded)
    const qtyStr = String(item.quantity).padStart(2, "0");
    page.drawText(qtyStr, {
      x: colQty,
      y: textY,
      size: 9,
      font: regular,
      color: black,
    });

    // Unit price with /-
    page.drawText(formatNumberWithSlash(item.unitPriceCents), {
      x: colPrice + 10,
      y: textY,
      size: 9,
      font: regular,
      color: black,
    });

    // Amount with /-
    page.drawText(formatNumberWithSlash(item.totalCents), {
      x: colAmount + 5,
      y: textY,
      size: 9,
      font: regular,
      color: black,
    });

    rowY = cellY;
  });

  // ═══════════════════════════════════════════════════
  // ── Dashed Separator ──
  // ═══════════════════════════════════════════════════
  const dashY = rowY - 18;
  page.drawLine({
    start: { x: margin, y: dashY },
    end: { x: pageWidth - margin, y: dashY },
    thickness: 1,
    dashArray: [3, 2],
    color: black,
  });

  // ═══════════════════════════════════════════════════
  // ── Bank Details (bottom-left) ──
  // ═══════════════════════════════════════════════════
  let bankY = dashY - 32;

  page.drawText("BANK DETAILS", {
    x: margin,
    y: bankY,
    size: 10,
    font: sansBold,
  });
  const bankTitleW = sansBold.widthOfTextAtSize("BANK DETAILS", 10);
  page.drawLine({
    start: { x: margin, y: bankY - 2 },
    end: { x: margin + bankTitleW, y: bankY - 2 },
    thickness: 1,
  });

  bankY -= 26;
  const bankLines = bankDetails.split("\n");
  bankLines.forEach((line) => {
    page.drawText(line, {
      x: margin,
      y: bankY,
      size: 12,
      font: bold,
      color: black,
    });
    bankY -= 18;
  });

  // ═══════════════════════════════════════════════════
  // ── Totals (bottom-right) ──
  // ═══════════════════════════════════════════════════
  const totalsLabelX = 330;
  const totalsValueX = pageWidth - margin - 10;
  let totalsY = dashY - 32;

  // SUBTOTAL
  page.drawText("SUBTOTAL", {
    x: totalsLabelX,
    y: totalsY,
    size: 10,
    font: sansBold,
    color: black,
  });
  drawRightText(
    `${formatNumber(invoice.subtotalCents)} BDT`,
    totalsValueX,
    totalsY,
    {
      size: 10,
      font: bold,
      color: black,
    },
  );

  totalsY -= 26;

  // VAT/TAX
  page.drawText("VAT/TAX", {
    x: totalsLabelX,
    y: totalsY,
    size: 10,
    font: regular,
    color: black,
  });
  const taxAmount = centsToAmount(invoice.taxCents);
  drawRightText(taxAmount.toFixed(5), totalsValueX, totalsY, {
    size: 10,
    font: regular,
    color: black,
  });

  totalsY -= 26;

  // TOTAL row with background
  const totalRowH = 28;
  page.drawRectangle({
    x: totalsLabelX - 10,
    y: totalsY - 6,
    width: pageWidth - margin - totalsLabelX + 20,
    height: totalRowH,
    color: totalBg,
  });
  page.drawText("TOTAL", {
    x: totalsLabelX,
    y: totalsY + 2,
    size: 11,
    font: sansBold,
    color: blue,
  });
  drawRightText(money(invoice.totalCents), totalsValueX, totalsY + 2, {
    size: 11,
    font: bold,
    color: blue,
  });

  // ═══════════════════════════════════════════════════
  // ── DUE / PAID Seal Stamp (over bank details area) ──
  // ═══════════════════════════════════════════════════
  const sealImage = balanceCents > 0 ? sealDueImage : sealPaidImage;
  page.drawImage(sealImage, {
    x: 195,
    y: totalsY - 80,
    width: 90,
    height: 45,
    rotate: degrees(-12),
    opacity: 0.8,
  });

  // ═══════════════════════════════════════════════════
  // ── Signature + Sign Seal (left) ──
  // ═══════════════════════════════════════════════════
  const signY = totalsY - 250;
  const signImgW = 150;
  const signImgH = 90;
  page.drawImage(sealSignImage, {
    x: margin,
    y: signY,
    width: signImgW,
    height: signImgH,
  });

  // "Authorized By" label under signature
  page.drawLine({
    start: { x: margin, y: signY - 2 },
    end: { x: margin + signImgW, y: signY - 2 },
    thickness: 0.5,
    color: black,
  });
  const authText = "Authorized By";
  const authW = sansRegular.widthOfTextAtSize(authText, 8);
  page.drawText(authText, {
    x: margin + (signImgW - authW) / 2,
    y: signY - 13,
    size: 9,
    font: sansBold,
    color: black,
  });

  // ═══════════════════════════════════════════════════
  // ── Circle Seal (right) ──
  // ═══════════════════════════════════════════════════
  const circleSealW = 80;
  const circleSealH = 80;
  page.drawImage(sealCircleImage, {
    x: pageWidth - margin - circleSealW - 30,
    y: signY - 5,
    width: circleSealW,
    height: circleSealH,
  });

  // ═══════════════════════════════════════════════════
  // ── Footer ──
  // ═══════════════════════════════════════════════════
  const footerBarY = 55;
  const footerDark = rgb(0.12, 0.16, 0.25);

  // Thick dark top bar
  page.drawRectangle({
    x: 0,
    y: footerBarY,
    width: pageWidth,
    height: 1,
    color: footerDark,
  });

  // Footer message - changes based on payment status
  const footerMsg =
    balanceCents > 0
      ? "Thank you for your business. Please ensure timely payment by the due date to avoid any inconvenience."
      : "Payment received with thanks! We truly appreciate your business and look forward to working with you again.";

  const footerMsgWidth = regular.widthOfTextAtSize(footerMsg, 8);
  if (footerMsgWidth > pageWidth - margin * 2) {
    // Split into two centered lines
    const words = footerMsg.split(" ");
    let line1 = "";
    let line2 = "";
    for (const word of words) {
      const test = line1 ? `${line1} ${word}` : word;
      if (
        regular.widthOfTextAtSize(test, 8) > pageWidth - margin * 2 &&
        line1
      ) {
        line2 += (line2 ? " " : "") + word;
      } else {
        line1 = test;
      }
    }
    const l1w = regular.widthOfTextAtSize(line1, 8);
    const l2w = regular.widthOfTextAtSize(line2, 8);
    page.drawText(line1, {
      x: (pageWidth - l1w) / 2,
      y: footerBarY - 14,
      size: 8,
      font: regular,
      color: footerDark,
    });
    page.drawText(line2, {
      x: (pageWidth - l2w) / 2,
      y: footerBarY - 26,
      size: 8,
      font: regular,
      color: footerDark,
    });
  } else {
    page.drawText(footerMsg, {
      x: (pageWidth - footerMsgWidth) / 2,
      y: footerBarY - 18,
      size: 8,
      font: regular,
      color: footerDark,
    });
  }

  return {
    bytes: await doc.save(),
    fileName: data.fileName,
    data,
  };
}
