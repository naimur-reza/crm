import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { recordPayment } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { Money } from "@/components/ui/format";
import { Field, Select, TextArea } from "@/components/ui/field";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { invoices, paymentRecords } from "@/lib/db/schema";

export default async function PaymentsPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const [paymentRows, invoiceRows] = await Promise.all([
    getDb()
      .select({
        id: paymentRecords.id,
        amountCents: paymentRecords.amountCents,
        paymentDate: paymentRecords.paymentDate,
        method: paymentRecords.method,
        reference: paymentRecords.reference,
        notes: paymentRecords.notes,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(paymentRecords)
      .innerJoin(invoices, eq(paymentRecords.invoiceId, invoices.id))
      .orderBy(desc(paymentRecords.createdAt)),
    getDb()
      .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, totalCents: invoices.totalCents })
      .from(invoices)
      .orderBy(desc(invoices.createdAt)),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payments"
        description="Manual client payment records connected to CRM invoices."
        action={
          <ModalForm
            title="Record payment"
            description="Record an offline or manual payment against an invoice."
            triggerLabel="Record payment"
            action={recordPayment}
            submitLabel="Save payment"
            formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
          >
            <Select label="Invoice" name="invoiceId" required>
              <option value="">Choose invoice</option>
              {invoiceRows.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber}
                </option>
              ))}
            </Select>
            <Field label="Amount" name="amount" type="number" step="0.01" required />
            <Field label="Payment date" name="paymentDate" type="date" required />
            <Field label="Method" name="method" placeholder="Bank, cash, bKash, cheque" required />
            <Field label="Reference" name="reference" />
            <div className="md:col-span-2">
              <TextArea label="Notes" name="notes" />
            </div>
          </ModalForm>
        }
      />
      <DataTable
        headers={["Invoice", "Amount", "Date", "Method", "Reference", "Notes"]}
        empty="No payments recorded yet."
        rows={paymentRows.map((payment) => [
          payment.invoiceNumber,
          <Money key="amount" cents={payment.amountCents} />,
          payment.paymentDate,
          payment.method,
          payment.reference ?? "-",
          payment.notes ?? "-",
        ])}
      />
    </div>
  );
}
