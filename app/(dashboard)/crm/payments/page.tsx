import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { recordPayment } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Money } from "@/components/ui/format";
import { Field, Select, TextArea } from "@/components/ui/field";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { invoices, paymentRecords } from "@/lib/db/schema";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, paymentRows, invoiceRows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentRecords)
      .innerJoin(invoices, eq(paymentRecords.invoiceId, invoices.id))
      .then((r) => r[0]),
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
      .orderBy(desc(paymentRecords.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, totalCents: invoices.totalCents })
      .from(invoices)
      .orderBy(desc(invoices.createdAt)),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Payments</h2>
        <ModalForm
          title="Record payment"
          description="Record a payment against an invoice."
          triggerLabel="Record payment"
          action={recordPayment}
        >
          <Select label="Invoice" name="invoiceId" required>
            <option value="">Choose invoice</option>
            {invoiceRows.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber}
              </option>
            ))}
          </Select>
          <Field name="amount" label="Amount (USD)" type="number" step="0.01" required />
          <Field name="paymentDate" label="Payment date" type="date" required />
          <Select label="Method" name="method" required>
            <option value="">Choose method</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="check">Check</option>
            <option value="credit_card">Credit card</option>
            <option value="mobile_banking">Mobile banking</option>
          </Select>
          <Field name="reference" label="Reference" />
          <TextArea name="notes" label="Notes" />
        </ModalForm>
      </div>

      <DataTable
        headers={["Invoice", "Amount", "Date"]}
        empty="No payments recorded yet."
        rows={paymentRows.map((payment) => [
          payment.invoiceNumber,
          <Money key="amount" cents={payment.amountCents} />,
          payment.paymentDate,
        ])}
      />
      <Pagination {...pagination} />
    </div>
  );
}
