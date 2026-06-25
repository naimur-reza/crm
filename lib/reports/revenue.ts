import "server-only";
import { sql, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoices, clients, paymentRecords } from "@/lib/db/schema";
import type { ReportResult } from "./types";

export async function getRevenueReport(): Promise<ReportResult> {
  const db = getDb();

  const [byClient, totals, paymentData] = await Promise.all([
    db
      .select({
        clientName: clients.name,
        invoiceCount: sql<number>`count(${invoices.id})::int`,
        totalBilled: sql<number>`coalesce(sum(${invoices.totalCents}), 0)::int`,
        totalPaid: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int`,
        status: clients.status,
      })
      .from(clients)
      .leftJoin(invoices, eq(invoices.clientId, clients.id))
      .leftJoin(paymentRecords, eq(paymentRecords.invoiceId, invoices.id))
      .groupBy(clients.name, clients.status)
      .orderBy(sql`coalesce(sum(${invoices.totalCents}), 0) desc`),
    db
      .select({
        totalBilled: sql<number>`coalesce(sum(${invoices.totalCents}), 0)::int`,
        totalPaid: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int`,
        invoiceCount: sql<number>`count(distinct ${invoices.id})::int`,
      })
      .from(invoices)
      .leftJoin(paymentRecords, eq(paymentRecords.invoiceId, invoices.id)),
    db
      .select({
        status: invoices.status,
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${invoices.totalCents}), 0)::int`,
      })
      .from(invoices)
      .groupBy(invoices.status),
  ]);

  const totalsRow = totals[0] ?? { totalBilled: 0, totalPaid: 0, invoiceCount: 0 };
  const outstanding = totalsRow.totalBilled - totalsRow.totalPaid;

  return {
    title: "Revenue by Client",
    description: "Invoice revenue breakdown by client with payment tracking.",
    summaryCards: [
      { label: "Total Billed", value: `$${(totalsRow.totalBilled / 100).toLocaleString()}`, tone: "blue" },
      { label: "Total Paid", value: `$${(totalsRow.totalPaid / 100).toLocaleString()}`, tone: "green" },
      { label: "Outstanding", value: `$${(outstanding / 100).toLocaleString()}`, tone: outstanding > 0 ? "amber" : "green" },
      { label: "Invoices", value: totalsRow.invoiceCount, tone: "purple" },
    ],
    columns: [
      { key: "clientName", label: "Client" },
      { key: "invoiceCount", label: "Invoices", format: "number" },
      { key: "totalBilled", label: "Total Billed", format: "currency" },
      { key: "totalPaid", label: "Total Paid", format: "currency" },
    ],
    rows: byClient.map((r) => ({ ...r })),
    chartData: paymentData.map((r) => ({
      name: r.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: r.total,
    })),
    chartType: "pie",
  };
}
