import { notFound, redirect } from "next/navigation";
import { CalendarClock, CreditCard, ReceiptText } from "lucide-react";
import { deleteInvoice, recordPayment, updateInvoice } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { InvoiceShareActions } from "@/components/invoice-share-actions";
import { ModalForm } from "@/components/modal-form";
import { PageHeader, Surface } from "@/components/page-header";
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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { id } = await params;
  const { invoice, items, payments, notifications, clientContactRows, leadContactRows } =
    await getInvoiceDetail(id);
  if (!invoice) notFound();

  const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const balanceCents = Math.max(0, invoice.totalCents - paidCents);
  const primaryClientContact =
    clientContactRows.find((contact) => contact.isPrimary) ?? clientContactRows[0];
  const primaryLeadContact =
    leadContactRows.find((contact) => contact.isPrimary) ?? leadContactRows[0];
  const invoiceContact = primaryClientContact ?? primaryLeadContact;
  const invoicePhone = primaryLeadContact?.whatsappNumber || invoiceContact?.phone;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={invoice.invoiceNumber}
        description={invoice.clientName || invoice.leadTitle || "Invoice"}
        backHref="/crm/invoices"
        action={<Badge tone={invoiceTone(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-4">
          <Surface className="overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Bill to</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">
                    {invoice.clientName || invoice.leadTitle || "Unassigned"}
                  </h2>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>Issued <DateText value={invoice.issueDate} /></p>
                  <p>Due <DateText value={invoice.dueDate} /></p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3">
              {[
                { label: "Total", value: <Money key="total" cents={invoice.totalCents} />, icon: ReceiptText },
                { label: "Paid", value: <Money key="paid" cents={paidCents} />, icon: CreditCard },
                { label: "Due", value: <Money key="balance" cents={balanceCents} />, icon: CalendarClock },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-500">{item.label}</p>
                      <Icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </Surface>

          <DataTable
            headers={["Item", "Qty", "Unit", "Total"]}
            empty="No invoice items."
            rows={items.map((item) => [
              <span key="item" className="font-medium text-slate-950">{item.description}</span>,
              item.quantity,
              <Money key="unit" cents={item.unitPriceCents} />,
              <Money key="total" cents={item.totalCents} />,
            ])}
          />

          <section className="grid gap-4 lg:grid-cols-2">
            <Surface className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-950">Payments</h2>
                <ModalForm
                  title="Record payment"
                  description="Add payment details."
                  triggerLabel="Add payment"
                  action={recordPayment}
                  submitLabel="Save payment"
                  formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
                >
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <Field label="Amount" name="amount" type="number" step="0.01" required />
                  <Field label="Payment date" name="paymentDate" type="date" required />
                  <Field label="Method" name="method" placeholder="Bank transfer" required />
                  <Field label="Reference" name="reference" />
                  <div className="md:col-span-2">
                    <TextArea label="Notes" name="notes" />
                  </div>
                </ModalForm>
              </div>
              <div className="grid gap-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{payment.method}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          <DateText value={payment.paymentDate} />
                        </p>
                      </div>
                      <Money cents={payment.amountCents} />
                    </div>
                    {payment.reference || payment.notes ? (
                      <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                        {payment.reference || payment.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
                {!payments.length ? <p className="text-sm text-slate-500">No payments yet.</p> : null}
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="font-semibold text-slate-950">Timeline</h2>
              <div className="mt-4 grid max-h-80 gap-3 overflow-y-auto pr-1">
                {notifications.map((notification) => (
                  <a
                    key={notification.id}
                    href={notification.waLink || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-slate-200 p-4 text-sm transition hover:border-[#3995d2]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-medium text-slate-950">
                        {notification.recipientName || notification.recipientPhone || "Recipient"}
                      </p>
                      <Badge tone="green">{notification.channel}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-slate-500">{notification.message}</p>
                  </a>
                ))}
                {!notifications.length ? <p className="text-sm text-slate-500">No sends yet.</p> : null}
              </div>
            </Surface>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <Surface className="p-5">
            <h2 className="font-semibold text-slate-950">Send</h2>
            <div className="mt-4 grid gap-2">
              <InvoiceShareActions
                invoiceId={invoice.id}
                defaultName={invoiceContact?.name || invoice.clientName || invoice.leadTitle}
                defaultEmail={invoiceContact?.email}
                defaultPhone={invoicePhone}
              />
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="font-semibold text-slate-950">Manage</h2>
            <div className="mt-4 grid gap-2">
              <ModalForm
                title="Edit invoice"
                description="Update invoice details."
                triggerLabel="Edit invoice"
                action={updateInvoice}
                submitLabel="Save invoice"
                formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
              >
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
                <Field
                  label="Discount"
                  name="discount"
                  type="number"
                  step="0.01"
                  defaultValue={String((invoice.discountCents ?? 0) / 100 || "")}
                />
                <Field
                  label="Tax"
                  name="tax"
                  type="number"
                  step="0.01"
                  defaultValue={String((invoice.taxCents ?? 0) / 100 || "")}
                />
                <div className="md:col-span-2">
                  <TextArea label="Notes" name="notes" defaultValue={invoice.notes ?? ""} />
                </div>
              </ModalForm>
              <DeleteButton
                action={deleteInvoice}
                id={invoice.id}
                label="Delete invoice"
                confirmMessage="Delete this invoice, its items, and payment records? Notification logs will remain but no longer point to this invoice."
                redirectTo="/crm/invoices"
              />
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="font-semibold text-slate-950">Details</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              {[
                ["Status", <Badge key="status" tone={invoiceTone(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>],
                ["Issue", <DateText key="issue" value={invoice.issueDate} />],
                ["Due", <DateText key="due" value={invoice.dueDate} />],
                ["Tax", <Money key="tax" cents={invoice.taxCents} />],
                ["Discount", <Money key="discount" cents={invoice.discountCents} />],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-950">{value}</dd>
                </div>
              ))}
            </dl>
            {invoice.notes ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{invoice.notes}</p>
            ) : null}
          </Surface>
        </aside>
      </section>
    </div>
  );
}
