import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 50;
const contentWidth = pageWidth - margin * 2;

function centsToAmount(cents: number) {
  return (cents ?? 0) / 100;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(centsToAmount(cents));
}

function shortDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type PayslipData = {
  companyName: string;
  companyAddress: string;
  periodName: string;
  employeeName: string;
  employeeDesignation: string;
  departmentName: string;
  joiningDate: string;
  bankName: string;
  accountNumber: string;
  grossPayCents: number;
  totalDeductionsCents: number;
  netPayCents: number;
  earningsBreakdown: Record<string, number>;
  deductionsBreakdown: Record<string, { name: string; amountCents: number }>;
  attendanceSummary: Record<string, number>;
};

export async function generatePayslipPdf(data: PayslipData) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([pageWidth, pageHeight]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);
  const darkBlue = rgb(0.1, 0.22, 0.42);
  const headerBg = rgb(0.13, 0.53, 0.8);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const totalBg = rgb(0.9, 0.94, 0.97);

  function drawText(
    value: string,
    x: number,
    y: number,
    options: { size?: number; font?: typeof regular; color?: ReturnType<typeof rgb> } = {},
  ) {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const color = options.color ?? black;
    page.drawText(value, { x, y, size, font, color });
    return y - (size + 4);
  }

  function drawRightText(
    value: string,
    rightX: number,
    y: number,
    options: { size?: number; font?: typeof regular; color?: ReturnType<typeof rgb> } = {},
  ) {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const color = options.color ?? black;
    const width = font.widthOfTextAtSize(value, size);
    page.drawText(value, { x: rightX - width, y, size, font, color });
  }

  let y = pageHeight - margin;

  // Title
  drawText("PAYSLIP", margin, y, { size: 24, font: bold, color: darkBlue });
  drawRightText(data.periodName, pageWidth - margin, y, { size: 14, font: bold, color: darkBlue });
  y -= 30;

  // Separator
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1.5,
    color: darkBlue,
  });
  y -= 20;

  // Company Info
  drawText(data.companyName, margin, y, { size: 12, font: bold });
  y -= 16;
  drawText(data.companyAddress, margin, y, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  y -= 25;

  // Employee Info Section
  const infoLeft = margin;
  const infoRight = margin + 300;
  const labelWidth = 100;

  const infoY = y;
  drawText("Employee Information", margin, infoY, { size: 11, font: bold, color: darkBlue });
  y -= 20;

  const infoRows: [string, string][] = [
    ["Name", data.employeeName],
    ["Designation", data.employeeDesignation],
    ["Department", data.departmentName],
    ["Joining Date", shortDate(data.joiningDate)],
  ];

  for (const [label, value] of infoRows) {
    drawText(label + ":", margin, y, { size: 9 });
    drawText(value, margin + labelWidth, y, { size: 9, font: bold });
    y -= 14;
  }

  // Bank Info
  y -= 6;
  drawText("Bank Details", infoRight, infoY, { size: 11, font: bold, color: darkBlue });
  let bankY = infoY - 20;
  const bankRows: [string, string][] = [
    ["Bank", data.bankName],
    ["Account", data.accountNumber],
  ];
  for (const [label, value] of bankRows) {
    drawText(label + ":", infoRight, bankY, { size: 9 });
    drawText(value, infoRight + labelWidth, bankY, { size: 9, font: bold });
    bankY -= 14;
  }

  y = Math.min(y, bankY) - 20;

  // Separator
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: lightGray,
  });
  y -= 15;

  const tableLeft = margin;
  const tableRight = pageWidth - margin;
  const descCol = margin + 10;
  const amountCol = pageWidth - margin - 10;
  const headerH = 22;

  function drawTableHeader(label: string, startY: number) {
    page.drawRectangle({
      x: margin,
      y: startY - headerH,
      width: contentWidth,
      height: headerH,
      color: headerBg,
    });
    drawText(label, descCol, startY - headerH + 6, { size: 9, font: bold, color: white });
    drawText("Amount", amountCol, startY - headerH + 6, { size: 9, font: bold, color: white });
    return startY - headerH;
  }

  function drawRow(label: string, amountCents: number, startY: number, isBold = false) {
    const rowH = 20;
    const cellY = startY - rowH;
    page.drawLine({
      start: { x: margin, y: cellY },
      end: { x: tableRight, y: cellY },
      thickness: 0.5,
      color: lightGray,
    });
    drawText(label, descCol, cellY + 5, { size: 9, font: isBold ? bold : regular });
    drawRightText(formatMoney(amountCents), amountCol, cellY + 5, { size: 9, font: isBold ? bold : regular });
    return cellY;
  }

  function drawTotalRow(label: string, amountCents: number, startY: number) {
    const rowH = 24;
    const cellY = startY - rowH;
    page.drawRectangle({
      x: margin,
      y: cellY,
      width: contentWidth,
      height: rowH,
      color: totalBg,
    });
    drawText(label, descCol, cellY + 7, { size: 10, font: bold });
    drawRightText(formatMoney(amountCents), amountCol, cellY + 7, { size: 10, font: bold });
    return cellY;
  }

  // Earnings Table
  y = drawTableHeader("Earnings", y);

  const earnings = data.earningsBreakdown;
  const earningLabels: Record<string, string> = {
    basic: "Basic Salary",
    housing: "Housing Allowance",
    transport: "Transport Allowance",
    medical: "Medical Allowance",
  };

  for (const [key, label] of Object.entries(earningLabels)) {
    if ((earnings[key] ?? 0) > 0) {
      y = drawRow(label, earnings[key], y);
    }
  }

  for (const [key, val] of Object.entries(earnings)) {
    if (!["basic", "housing", "transport", "medical", "gross"].includes(key) && val > 0) {
      y = drawRow(key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), val, y);
    }
  }

  y = drawTotalRow("Gross Pay", data.grossPayCents, y);
  y -= 10;

  // Deductions Table
  y = drawTableHeader("Deductions", y);

  for (const [, d] of Object.entries(data.deductionsBreakdown)) {
    if (d.amountCents > 0) {
      y = drawRow(d.name, d.amountCents, y);
    }
  }

  if (Object.keys(data.deductionsBreakdown).length === 0) {
    y = drawRow("No deductions", 0, y);
  }

  y = drawTotalRow("Total Deductions", data.totalDeductionsCents, y);
  y -= 10;

  // Net Pay
  const netRowH = 28;
  const netY = y - netRowH;
  page.drawRectangle({
    x: margin,
    y: netY,
    width: contentWidth,
    height: netRowH,
    color: darkBlue,
  });
  drawText("NET PAY", descCol, netY + 8, { size: 12, font: bold, color: white });
  drawRightText(formatMoney(data.netPayCents), amountCol, netY + 8, { size: 12, font: bold, color: white });
  y = netY - 20;

  // Attendance Summary
  if (data.attendanceSummary) {
    y -= 10;
    drawText("Attendance Summary", margin, y, { size: 10, font: bold, color: darkBlue });
    y -= 16;
    const att = data.attendanceSummary;
    const attItems = [
      ["Working Days", String(att.workingDays ?? 0)],
      ["Present", String(att.presentDays ?? 0)],
      ["Late", String(att.lateDays ?? 0)],
    ];
    let attX = margin;
    for (const [label, value] of attItems) {
      drawText(`${label}: ${value}`, attX, y, { size: 8, color: rgb(0.4, 0.4, 0.4) });
      attX += 120;
    }
  }

  const bytes = await doc.save();
  return { bytes };
}
