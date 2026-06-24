import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { Clock, FilePlus2, ReceiptText, Send, Wallet } from "lucide-react";
import { createInvoice, markInvoiceSent } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { DateText, Money } from "@/components/ui/format";
import { Field, Select, TextArea } from "@/components/ui/field";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  clients,
  invoices,
  leads,
  notificationLogs,
  paymentRecords,
} from "@/lib/db/schema";

function invoiceTone(status: string) {
  if (status === "paid") return "green";
  if (status === "partially_paid") return "amber";
  if (status === "overdue" || status === "cancelled") return "red";
  return "blue";
}

function statusLabel(status: string) {
  return status.replace("_", " ");
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "crm_invoices")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [statsRows, invoiceRows, leadRows, clientRows, logRows, { count }] =
    await Promise.all([
      getDb()
        .select({
          id: invoices.id,
          status: invoices.status,
          totalCents: invoices.totalCents,
          dueDate: invoices.dueDate,
          paidCents: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int`,
        })
        .from(invoices)
        .leftJoin(paymentRecords, eq(paymentRecords.invoiceId, invoices.id))
        .groupBy(invoices.id),
      getDb()
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          totalCents: invoices.totalCents,
          clientId: invoices.clientId,
          leadId: invoices.leadId,
          leadTitle: leads.title,
          clientName: clients.name,
          paidCents: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int`,
        })
        .from(invoices)
        .leftJoin(leads, eq(invoices.leadId, leads.id))
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(paymentRecords, eq(paymentRecords.invoiceId, invoices.id))
        .groupBy(
          invoices.id,
          leads.title,
          clients.name,
        )
        .orderBy(desc(invoices.createdAt))
        .limit(pageSize)
        .offset(offset),
      getDb().select({ id: leads.id, title: leads.title }).from(leads),
      getDb().select({ id: clients.id, name: clients.name }).from(clients),
      getDb()
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.channel, "whatsapp"))
        .orderBy(desc(notificationLogs.createdAt))
        .limit(8),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .then((r) => r[0]),
    ]);
  const openInvoices = statsRows.filter(
    (invoice) => invoice.status !== "paid" && invoice.status !== "cancelled",
  );
  const overdueInvoices = statsRows.filter((invoice) => {
    if (!invoice.dueDate || invoice.status === "paid" || invoice.status === "cancelled") {
      return false;
    }
    return new Date(`${invoice.dueDate}T00:00:00`) < new Date();
  });
  const totalReceivableCents = openInvoices.reduce(
    (sum, invoice) => sum + Math.max(0, invoice.totalCents - invoice.paidCents),
    0,
  );
  const totalPaidCents = statsRows.reduce((sum, invoice) => sum + invoice.paidCents, 0);
  const sentCount = statsRows.filter((invoice) => invoice.status === "sent").length;

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">CRM</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Invoices</h1>
        </div>
        <ModalForm
          title="Create invoice"
          description="Generate a new invoice for a lead or client."
          triggerLabel="Create invoice"
          action={createInvoice}
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
        >
          <Select label="Lead" name="leadId">
            <option value="">No lead</option>
            {leadRows.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.title}
              </option>
            ))}
          </Select>
          <Select label="Client" name="clientId">
            <option value="">No client</option>
            {clientRows.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          <Field name="issueDate" label="Issue date" type="date" required />
          <Field name="dueDate" label="Due date" type="date" />
          <div className="col-span-full border-t border-sky-100 pt-4">
            <p className="mb-3 text-sm font-bold text-slate-800">Line item</p>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
              <Field name="itemDescription" label="Description" required />
              <Field name="quantity" label="Quantity" type="number" defaultValue="1" required />
              <Field name="unitPrice" label="Unit price (USD)" type="number" step="0.01" required />
            </div>
          </div>
          <Field name="discount" label="Discount (USD)" type="number" step="0.01" />
          <Field name="tax" label="Tax (USD)" type="number" step="0.01" />
          <TextArea name="notes" label="Notes" />
        </ModalForm>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Receivable",
            value: <Money cents={totalReceivableCents} />,
            icon: Wallet,
            tone: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
          },
          {
            label: "Paid",
            value: <Money cents={totalPaidCents} />,
            icon: ReceiptText,
            tone: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
          },
          {
            label: "Overdue",
            value: overdueInvoices.length,
            icon: Clock,
            tone: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
          },
          {
            label: "Sent",
            value: sentCount,
            icon: Send,
            tone: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="group relative min-h-28 overflow-hidden rounded-xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
                  <p className="mt-4 text-2xl font-bold leading-none text-slate-800">{card.value}</p>
                </div>
                <span className={`rounded-xl p-2 ring-1 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-1 rounded-full bg-sky-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Records</p>
                <h2 className="mt-0.5 text-base font-black text-slate-800">All Invoices</h2>
              </div>
            </div>
          </div>
          <div className="p-5">
            <DataTable
              headers={["Invoice", "Status"]}
              empty="No invoices yet."
              rows={invoiceRows.map((invoice) => [
                <div key="number" className="grid gap-1">
                  <Link
                    href={`/crm/invoices/${invoice.id}`}
                    className="font-mono text-sm font-bold text-slate-800 transition hover:text-sky-700"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                  <span className="text-xs text-slate-400">
                    Issued <DateText value={invoice.issueDate} />
                  </span>
                </div>,
                <Badge key="status" tone={invoiceTone(invoice.status)}>
                  {statusLabel(invoice.status)}
                </Badge>,
              ])}
            />
            <Pagination {...pagination} />
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-800">Recent sends</h2>
            <FilePlus2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-4 grid max-h-96 gap-3 overflow-y-auto pr-1">
            {logRows.map((log) => (
              <a
                key={log.id}
                href={log.waLink ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg border border-sky-100 p-3 text-sm transition hover:border-sky-200"
              >
                <p className="truncate font-bold text-slate-800">{log.recipientName || log.recipientPhone}</p>
                <p className="mt-1 line-clamp-2 text-slate-400">{log.message}</p>
              </a>
            ))}
            {!logRows.length ? <p className="text-sm text-slate-400">No sends yet.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
