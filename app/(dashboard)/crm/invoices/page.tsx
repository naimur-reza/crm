import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowUpRight, Clock, FilePlus2, ReceiptText, Send, Wallet } from "lucide-react";
import { createInvoice, markInvoiceSent } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader, Surface } from "@/components/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { DateText, Money } from "@/components/ui/format";
import { Field, Select, TextArea } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
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

export default async function InvoicesPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const [invoiceRows, leadRows, clientRows, logRows] =
    await Promise.all([
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
        .orderBy(desc(invoices.createdAt)),
      getDb().select({ id: leads.id, title: leads.title }).from(leads),
      getDb().select({ id: clients.id, name: clients.name }).from(clients),
      getDb()
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.channel, "whatsapp"))
        .orderBy(desc(notificationLogs.createdAt))
        .limit(8),
    ]);
  const openInvoices = invoiceRows.filter(
    (invoice) => invoice.status !== "paid" && invoice.status !== "cancelled",
  );
  const overdueInvoices = invoiceRows.filter((invoice) => {
    if (!invoice.dueDate || invoice.status === "paid" || invoice.status === "cancelled") {
      return false;
    }
    return new Date(`${invoice.dueDate}T00:00:00`) < new Date();
  });
  const totalReceivableCents = openInvoices.reduce(
    (sum, invoice) => sum + Math.max(0, invoice.totalCents - invoice.paidCents),
    0,
  );
  const totalPaidCents = invoiceRows.reduce((sum, invoice) => sum + invoice.paidCents, 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Invoices"
        description="Billing, payments, and delivery."
        action={
          <ModalForm
            title="New invoice"
            description="Pick an account, add one line item, and set payment terms."
            triggerLabel="New invoice"
            action={createInvoice}
            submitLabel="Create invoice"
            formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4"
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
            <Field label="Issue date" name="issueDate" type="date" required />
            <Field label="Due date" name="dueDate" type="date" />
            <Field label="Item" name="itemDescription" required />
            <Field label="Quantity" name="quantity" type="number" defaultValue="1" min="1" />
            <Field label="Unit price" name="unitPrice" type="number" step="0.01" required />
            <Field label="Discount" name="discount" type="number" step="0.01" />
            <Field label="Tax" name="tax" type="number" step="0.01" />
            <div className="lg:col-span-3">
              <TextArea label="Notes" name="notes" />
            </div>
          </ModalForm>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Receivable",
            value: <Money cents={totalReceivableCents} />,
            helper: `${openInvoices.length} open`,
            icon: Wallet,
            tone: "bg-sky-50 text-sky-700",
          },
          {
            label: "Paid",
            value: <Money cents={totalPaidCents} />,
            helper: "Recorded payments",
            icon: ReceiptText,
            tone: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Overdue",
            value: overdueInvoices.length,
            helper: "Need follow-up",
            icon: Clock,
            tone: "bg-rose-50 text-rose-700",
          },
          {
            label: "Sent",
            value: invoiceRows.filter((invoice) => invoice.status === "sent").length,
            helper: "Awaiting payment",
            icon: Send,
            tone: "bg-violet-50 text-violet-700",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Surface key={card.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{card.helper}</p>
                </div>
                <span className={`rounded-xl p-2 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </Surface>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <DataTable
          headers={["Invoice", "Account", "Due", "Balance", "Status", ""]}
          empty="No invoices yet."
          rows={invoiceRows.map((invoice) => {
            const balanceCents = Math.max(0, invoice.totalCents - invoice.paidCents);
            return [
              <div key="number" className="grid gap-1">
                <Link
                  href={`/crm/invoices/${invoice.id}`}
                  className="font-mono text-sm font-semibold text-slate-950 transition hover:text-[#3995d2]"
                >
                  {invoice.invoiceNumber}
                </Link>
                <span className="text-xs text-slate-500">
                  Issued <DateText value={invoice.issueDate} />
                </span>
              </div>,
              <div key="account" className="grid gap-1">
                <span className="font-medium text-slate-950">
                  {invoice.clientName || invoice.leadTitle || "Unassigned"}
                </span>
                <span className="text-xs text-slate-500">
                  {invoice.clientId ? "Client" : invoice.leadId ? "Lead" : "Manual"}
                </span>
              </div>,
              <DateText key="due" value={invoice.dueDate} />,
              <div key="balance" className="grid gap-1">
                <Money cents={balanceCents} />
                <span className="text-xs text-slate-500">
                  Paid <Money cents={invoice.paidCents} />
                </span>
              </div>,
              <Badge key="status" tone={invoiceTone(invoice.status)}>
                {statusLabel(invoice.status)}
              </Badge>,
              <div key="actions" className="flex items-center justify-end gap-2">
                {invoice.status === "draft" ? (
                  <ToastActionForm action={markInvoiceSent} successMessage="Invoice marked as sent.">
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <ActionButton variant="secondary" size="xs">Send</ActionButton>
                  </ToastActionForm>
                ) : null}
                <Link
                  href={`/crm/invoices/${invoice.id}`}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-[#3995d2] px-3 text-xs font-semibold text-white transition hover:bg-[#2f80bd]"
                >
                  Open <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>,
            ];
          })}
        />

        <Surface className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">Recent sends</h2>
            <FilePlus2 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-4 grid max-h-96 gap-3 overflow-y-auto pr-1">
            {logRows.map((log) => (
              <a
                key={log.id}
                href={log.waLink ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg border border-slate-200 p-3 text-sm transition hover:border-[#3995d2]"
              >
                <p className="truncate font-medium text-slate-950">{log.recipientName || log.recipientPhone}</p>
                <p className="mt-1 line-clamp-2 text-slate-500">{log.message}</p>
              </a>
            ))}
            {!logRows.length ? <p className="text-sm text-slate-500">No sends yet.</p> : null}
          </div>
        </Surface>
      </section>
    </div>
  );
}
