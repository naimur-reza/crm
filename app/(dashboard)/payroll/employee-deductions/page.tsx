import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Field, Select } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { assignEmployeeDeduction, removeEmployeeDeduction } from "@/app/actions/payroll";
import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { employeeDeductions, deductionDefinitions, employees } from "@/lib/db/schema";

export default async function EmployeeDeductionsPage() {
  const user = await requireUser();
  if (!canAccess(user, "payroll")) redirect("/dashboard");

  const [rows, employeeRows, deductionRows] = await Promise.all([
    getDb()
      .select({
        id: employeeDeductions.id,
        employeeName: employees.fullName,
        deductionName: deductionDefinitions.name,
        deductionCode: deductionDefinitions.code,
        isPercentage: employeeDeductions.isPercentage,
        amountCents: employeeDeductions.amountCents,
        rate: employeeDeductions.rate,
        effectiveFrom: employeeDeductions.effectiveFrom,
        effectiveTo: employeeDeductions.effectiveTo,
      })
      .from(employeeDeductions)
      .innerJoin(employees, eq(employeeDeductions.employeeId, employees.id))
      .innerJoin(deductionDefinitions, eq(employeeDeductions.deductionId, deductionDefinitions.id))
      .orderBy(desc(employeeDeductions.createdAt)),
    getDb()
      .select({ id: employees.id, fullName: employees.fullName })
      .from(employees)
      .where(eq(employees.status, "active"))
      .orderBy(employees.fullName),
    getDb()
      .select({ id: deductionDefinitions.id, name: deductionDefinitions.name, code: deductionDefinitions.code })
      .from(deductionDefinitions)
      .orderBy(deductionDefinitions.name),
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Payroll</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Employee Deductions</h1>
        </div>
        <ModalForm
          title="Assign deduction"
          description="Assign a deduction to an employee."
          triggerLabel="Assign deduction"
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          action={assignEmployeeDeduction}
        >
          <Select label="Employee" name="employeeId" required>
            <option value="">Select employee</option>
            {employeeRows.map((e) => (
              <option key={e.id} value={e.id}>{e.fullName}</option>
            ))}
          </Select>
          <Select label="Deduction" name="deductionId" required>
            <option value="">Select deduction</option>
            {deductionRows.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </Select>
          <Field name="amountCents" label="Amount (cents)" type="number" hint="For fixed amount" />
          <Field name="rate" label="Rate (%)" type="number" hint="For percentage (0-100)" />
          <Field name="isPercentage" label="Is percentage?" type="checkbox" />
          <Field name="effectiveFrom" label="Effective from" type="date" required />
          <Field name="effectiveTo" label="Effective to" type="date" />
        </ModalForm>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Assignments</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Employee Deductions</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Employee", "Deduction", "Value", "Effective", "Action"]}
            empty="No employee deductions assigned."
            rows={rows.map((r) => [
              <span key="emp" className="font-semibold text-slate-800">{r.employeeName}</span>,
              <span key="ded">{r.deductionName} ({r.deductionCode})</span>,
              r.isPercentage ? `${r.rate ?? 0}%` : `${r.amountCents ?? 0}¢`,
              `${r.effectiveFrom}${r.effectiveTo ? ` → ${r.effectiveTo}` : ""}`,
              <ToastActionForm key="del" action={removeEmployeeDeduction} successMessage="Deduction removed.">
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="text-xs text-red-600 hover:underline">Remove</button>
              </ToastActionForm>,
            ])}
          />
        </div>
      </div>
    </div>
  );
}
