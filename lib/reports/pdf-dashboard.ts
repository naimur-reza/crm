import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { eq, sql, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  attendanceRecords, clients, employees, tasks,
  invoices, paymentRecords, leaveRequests, expenseClaims,
} from "@/lib/db/schema";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 40;
const contentWidth = pageWidth - margin * 2;

export async function generateDashboardPdf() {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const darkBlue = rgb(0.1, 0.22, 0.42);
  const headerBg = rgb(0.13, 0.53, 0.8);

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const [empCount, attendance, openTasks, activeClients, completedTasks,
    totalBilled, totalPaid, pendingLeaves, pendingExpenses, overdueInvoices] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(employees).then((r) => r[0].value),
    db.select({ value: sql<number>`count(*)::int` }).from(attendanceRecords).where(sql`${attendanceRecords.attendanceDate} = ${today}`).then((r) => r[0].value),
    db.select({ value: sql<number>`count(*)::int` }).from(tasks).where(sql`${tasks.status} != 'done'`).then((r) => r[0].value),
    db.select({ value: sql<number>`count(*)::int` }).from(clients).where(sql`${clients.status} in ('lead', 'active')`).then((r) => r[0].value),
    db.select({ value: sql<number>`count(*)::int` }).from(tasks).where(eq(tasks.status, "done")).then((r) => r[0].value),
    db.select({ value: sql<number>`coalesce(sum(${invoices.totalCents}), 0)::int` }).from(invoices).then((r) => r[0].value),
    db.select({ value: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int` }).from(paymentRecords).then((r) => r[0].value),
    db.select({ value: sql<number>`count(*)::int` }).from(leaveRequests).where(eq(leaveRequests.status, "pending")).then((r) => r[0].value),
    db.select({ value: sql<number>`count(*)::int` }).from(expenseClaims).where(sql`${expenseClaims.status} in ('pending', 'draft')`).then((r) => r[0].value),
    db.select({ value: sql<number>`count(*)::int` }).from(invoices).where(sql`${invoices.status} = 'overdue'`).then((r) => r[0].value),
  ]);

  const companyName = process.env.COMPANY_INVOICE_NAME || "Company Tools";

  let page = doc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - margin;

  function drawHeader(title: string) {
    cursorY = pageHeight - margin - 10;
    page.drawText(companyName, {
      x: margin, y: cursorY, size: 18, font: bold, color: darkBlue,
    });
    cursorY -= 18;
    page.drawText(`Executive Dashboard — ${today}`, {
      x: margin, y: cursorY, size: 10, font: regular, color: gray,
    });
    cursorY -= 18;
    page.drawText(title, {
      x: margin, y: cursorY, size: 14, font: bold, color: black,
    });
    cursorY -= 20;
    page.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: pageWidth - margin, y: cursorY },
      thickness: 1, color: darkBlue,
    });
    cursorY -= 16;
  }

  drawHeader("Key Metrics");

  const metrics = [
    { label: "Total Employees", value: String(empCount) },
    { label: "Today's Attendance", value: String(attendance) },
    { label: "Open Tasks", value: String(openTasks) },
    { label: "Completed Tasks", value: String(completedTasks) },
    { label: "Active Clients", value: String(activeClients) },
    { label: "Revenue Billed", value: `$${(totalBilled / 100).toLocaleString()}` },
    { label: "Revenue Collected", value: `$${(totalPaid / 100).toLocaleString()}` },
    { label: "Outstanding", value: `$${((totalBilled - totalPaid) / 100).toLocaleString()}` },
    { label: "Pending Leaves", value: String(pendingLeaves) },
    { label: "Pending Expenses", value: String(pendingExpenses) },
    { label: "Overdue Invoices", value: String(overdueInvoices) },
  ];

  const colW = contentWidth / 3;
  metrics.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * colW;
    const y = cursorY - row * 36;

    page.drawRectangle({
      x, y: y - 28, width: colW - 8, height: 32,
      color: i % 2 === 0 ? rgb(0.95, 0.97, 0.99) : rgb(1, 1, 1),
    });
    page.drawText(m.label, {
      x: x + 4, y: y - 10, size: 8, font: regular, color: gray,
    });
    page.drawText(m.value, {
      x: x + 4, y: y - 24, size: 11, font: bold, color: black,
    });
  });

  const metricRows = Math.ceil(metrics.length / 3);
  cursorY -= metricRows * 36 + 20;

  // Task status breakdown
  const taskStatuses = await db
    .select({ status: tasks.status, count: sql<number>`count(*)::int` })
    .from(tasks).groupBy(tasks.status);

  if (cursorY < margin + 60) {
    page = doc.addPage([pageWidth, pageHeight]);
    cursorY = pageHeight - margin;
  }
  drawHeader("Task Status Breakdown");

  taskStatuses.forEach((t, i) => {
    const rowY = cursorY - i * 20;
    page.drawRectangle({
      x: margin, y: rowY - 16, width: contentWidth, height: 18,
      color: i % 2 === 0 ? rgb(0.95, 0.97, 0.99) : rgb(1, 1, 1),
    });
    page.drawText(t.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()), {
      x: margin + 4, y: rowY - 13, size: 9, font: regular, color: black,
    });
    const barW = (t.count / Math.max(...taskStatuses.map((s) => s.count))) * 300;
    page.drawRectangle({
      x: margin + 120, y: rowY - 14, width: barW, height: 14,
      color: headerBg,
    });
    page.drawText(String(t.count), {
      x: margin + 430, y: rowY - 13, size: 9, font: bold, color: darkBlue,
    });
  });

  // Recent tasks
  const recentTasksList = await db
    .select({ title: tasks.title, status: tasks.status })
    .from(tasks).orderBy(desc(tasks.createdAt)).limit(8);

  cursorY -= taskStatuses.length * 20 + 30;
  if (cursorY < margin + 60) {
    page = doc.addPage([pageWidth, pageHeight]);
    cursorY = pageHeight - margin;
  }
  drawHeader("Recent Tasks");

  recentTasksList.forEach((t, i) => {
    const rowY = cursorY - i * 18;
    page.drawText(t.title, {
      x: margin + 4, y: rowY - 13, size: 9, font: regular, color: black,
    });
    page.drawText(t.status.replace("_", " "), {
      x: pageWidth - margin - 80, y: rowY - 13, size: 9, font: regular, color: gray,
    });
  });

  page.drawText(
    `Generated on ${new Date().toLocaleString()} — Confidential`,
    { x: margin, y: margin - 10, size: 7, font: regular, color: gray },
  );

  const bytes = await doc.save();
  return { bytes, filename: `executive-dashboard-${today}.pdf` };
}
