import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Field, Select } from "@/components/ui/field";
import { saveBankDetails } from "@/app/actions/payroll";
import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { employeeBankDetails, employees } from "@/lib/db/schema";

export default async function BankDetailsPage() {
  const user = await requireUser();
  if (!canAccess(user, "payroll")) redirect("/dashboard");

  const [rows, employeeRows] = await Promise.all([
    getDb()
      .select({
        id: employeeBankDetails.id,
        employeeName: employees.fullName,
        bankName: employeeBankDetails.bankName,
        branchName: employeeBankDetails.branchName,
        accountNumber: employeeBankDetails.accountNumber,
        accountHolderName: employeeBankDetails.accountHolderName,
        ifscCode: employeeBankDetails.ifscCode,
        swiftCode: employeeBankDetails.swiftCode,
        isActive: employeeBankDetails.isActive,
        employeeId: employeeBankDetails.employeeId,
      })
      .from(employeeBankDetails)
      .innerJoin(employees, eq(employeeBankDetails.employeeId, employees.id))
      .orderBy(employees.fullName),
    getDb()
      .select({ id: employees.id, fullName: employees.fullName })
      .from(employees)
      .where(eq(employees.status, "active"))
      .orderBy(employees.fullName),
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Payroll</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Employee Bank Details</h1>
        </div>
        <ModalForm
          title="Add bank details"
          description="Link a bank account to an employee for salary transfer."
          triggerLabel="Add bank details"
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          action={saveBankDetails}
        >
          <Select label="Employee" name="employeeId" required>
            <option value="">Select employee</option>
            {employeeRows.map((e) => (
              <option key={e.id} value={e.id}>{e.fullName}</option>
            ))}
          </Select>
          <Field name="bankName" label="Bank name" required />
          <Field name="branchName" label="Branch name" />
          <Field name="accountHolderName" label="Account holder name" required />
          <Field name="accountNumber" label="Account number" required />
          <Field name="ifscCode" label="IFSC Code" />
          <Field name="swiftCode" label="SWIFT Code" />
        </ModalForm>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Banking</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Bank Accounts</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Employee", "Bank", "Account Holder", "Account Number", "IFSC", "Status"]}
            empty="No bank details added yet."
            rows={rows.map((r) => [
              <span key="emp" className="font-semibold text-slate-800">{r.employeeName}</span>,
              r.bankName,
              r.accountHolderName,
              <span key="acct" className="font-mono text-xs">{r.accountNumber}</span>,
              r.ifscCode ?? "-",
              r.isActive ? <span className="text-green-600 font-semibold">Active</span> : <span className="text-slate-400">Inactive</span>,
            ])}
          />
        </div>
      </div>
    </div>
  );
}
