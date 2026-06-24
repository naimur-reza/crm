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
  if (!canAccess(user, "crm_payments")) redirect("/dashboard");

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
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">CRM</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Payments</h1>
        </div>
        <ModalForm
          title="Record payment"
          description="Record a payment against an invoice."
          triggerLabel="Record payment"
          action={recordPayment}
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
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

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Records</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Payment History</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
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
      </div>
    </div>
  );
}
