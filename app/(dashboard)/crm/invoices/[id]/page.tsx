import { notFound, redirect } from "next/navigation";
import { CalendarClock, CreditCard, ReceiptText, Send, Settings, Info, Banknote, Mail, Phone } from "lucide-react";
import { deleteInvoice, recordPayment, updateInvoice } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { InvoiceShareActions } from "@/components/invoice-share-actions";
import { ModalForm } from "@/components/modal-form";
import { Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { DateText, Money } from "@/components/ui/format";
import { Field, Select, TextArea } from "@/components/ui/field";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getInvoiceDetail } from "@/lib/db/queries/crm";

function invoiceTone(status: string) {
  if (status === "paid") return "green";
  if (status === "partially_paid") return "amber";
  if (status === "overdue" || status === "cancelled") return "red";
  return "blue";
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { id } = await params;
  const { invoice, items, payments, notifications, clientContactRows, leadContactRows } = await getInvoiceDetail(id);
  if (!invoice) notFound();

  const paidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const balanceCents = Math.max(0, invoice.totalCents - paidCents);
  const primaryClientContact = clientContactRows.find((c) => c.isPrimary) ?? clientContactRows[0];
  const primaryLeadContact = leadContactRows.find((c) => c.isPrimary) ?? leadContactRows[0];
  const invoiceContact = primaryClientContact ?? primaryLeadContact;
  const invoicePhone = primaryLeadContact?.whatsappNumber || invoiceContact?.phone;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ReceiptText className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground font-mono">{invoice.invoiceNumber}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{invoice.clientName || invoice.leadTitle || "Invoice"}</span>
              <Badge tone={invoiceTone(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total", value: <Money cents={invoice.totalCents} />, icon: ReceiptText, tone: "bg-muted text-muted-foreground" },
          { label: "Paid", value: <Money cents={paidCents} />, icon: CreditCard, tone: "bg-emerald-50 text-emerald-600" },
          { label: "Due", value: <Money cents={balanceCents} />, icon: CalendarClock, tone: "bg-rose-50 text-rose-600" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</span>
                <span className={`rounded-lg p-1.5 ${stat.tone}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-4">
          <Surface className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Bill to</span>
                <h2 className="text-lg font-semibold text-foreground">{invoice.clientName || invoice.leadTitle || "Unassigned"}</h2>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Issued <DateText value={invoice.issueDate} /></span>
                <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Due <DateText value={invoice.dueDate} /></span>
              </div>
            </div>
          </Surface>

          <DataTable headers={["Item", "Qty", "Total"]} empty="No items." rows={items.map((item) => [
            <span key="d" className="font-medium text-foreground">{item.description}</span>,
            item.quantity,
            <Money key="t" cents={item.totalCents} />,
          ])} />

          <section className="grid gap-4 lg:grid-cols-2">
            <Surface className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Payments</h2>
                <ModalForm title="Record payment" description="Add a payment." triggerLabel="Add" triggerIcon={<Banknote className="h-4 w-4" />} triggerVariant="outline" triggerSize="sm" action={recordPayment} submitLabel="Save" formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <Field label="Amount" name="amount" type="number" step="0.01" required />
                  <Field label="Date" name="paymentDate" type="date" required />
                  <Field label="Method" name="method" placeholder="Bank transfer" required />
                  <Field label="Reference" name="reference" />
                  <div className="md:col-span-2"><TextArea label="Notes" name="notes" /></div>
                </ModalForm>
              </div>
              <div className="grid gap-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{payment.method}</p>
                        <p className="mt-1 text-xs text-muted-foreground"><DateText value={payment.paymentDate} /></p>
                      </div>
                      <span className="text-lg font-semibold text-emerald-600"><Money cents={payment.amountCents} /></span>
                    </div>
                    {(payment.reference || payment.notes) && <p className="mt-2 text-xs text-muted-foreground">{payment.reference || payment.notes}</p>}
                  </div>
                ))}
                {!payments.length && <p className="py-6 text-center text-sm text-muted-foreground">No payments</p>}
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="font-semibold text-foreground">Timeline</h2>
              <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <a key={n.id} href={n.waLink || "#"} target="_blank" rel="noreferrer" className="block rounded-xl border border-border p-3 text-sm transition hover:border-primary">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-medium text-foreground">{n.recipientName || n.recipientPhone || "Recipient"}</p>
                      <Badge tone="green">{n.channel}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  </a>
                ))}
                {!notifications.length && <p className="py-6 text-center text-sm text-muted-foreground">No sends</p>}
              </div>
            </Surface>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <Surface className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Send</h2>
            </div>
            <InvoiceShareActions invoiceId={invoice.id} defaultName={invoiceContact?.name || invoice.clientName || invoice.leadTitle} defaultEmail={invoiceContact?.email} defaultPhone={invoicePhone} />
          </Surface>

          <Surface className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Manage</h2>
            </div>
            <div className="grid gap-2">
              <ModalForm title="Edit invoice" description="Update invoice details." triggerLabel="Edit" triggerIcon={<Settings className="h-4 w-4" />} triggerVariant="outline" triggerClassName="w-full" action={updateInvoice} submitLabel="Save" formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <Select label="Status" name="status" defaultValue={invoice.status}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="partially_paid">Partially paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
                <Field label="Issue date" name="issueDate" type="date" defaultValue={invoice.issueDate} required />
                <Field label="Due date" name="dueDate" type="date" defaultValue={invoice.dueDate ?? ""} />
                <Field label="Discount" name="discount" type="number" step="0.01" defaultValue={String((invoice.discountCents ?? 0) / 100 || "")} />
                <Field label="Tax" name="tax" type="number" step="0.01" defaultValue={String((invoice.taxCents ?? 0) / 100 || "")} />
                <div className="md:col-span-2"><TextArea label="Notes" name="notes" defaultValue={invoice.notes ?? ""} /></div>
              </ModalForm>
              <DeleteButton action={deleteInvoice} id={invoice.id} label="Delete" confirmMessage="Delete this invoice?" redirectTo="/crm/invoices" />
            </div>
          </Surface>

          <Surface className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">Details</h2>
            </div>
            <dl className="grid gap-3 text-sm">
              {[
                ["Status", <Badge key="s" tone={invoiceTone(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>],
                ["Issue", <DateText key="i" value={invoice.issueDate} />],
                ["Due", <DateText key="d" value={invoice.dueDate} />],
                ["Subtotal", <Money key="st" cents={invoice.subtotalCents} />],
                ["Tax", <Money key="tx" cents={invoice.taxCents} />],
                ["Discount", <Money key="dc" cents={invoice.discountCents} />],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            {invoice.notes && <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">{invoice.notes}</p>}
          </Surface>
        </aside>
      </section>
    </div>
  );
}
