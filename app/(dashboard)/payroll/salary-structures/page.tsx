import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Field, Select } from "@/components/ui/field";
import { createSalaryStructure } from "@/app/actions/payroll";
import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { employees, salaryStructures } from "@/lib/db/schema";

export default async function SalaryStructuresPage() {
  const user = await requireUser();
  if (!canAccess(user, "payroll")) redirect("/dashboard");

  const [rows, employeeRows] = await Promise.all([
    getDb()
      .select({
        id: salaryStructures.id,
        employeeId: salaryStructures.employeeId,
        employeeName: employees.fullName,
        basicSalaryCents: salaryStructures.basicSalaryCents,
        housingAllowanceCents: salaryStructures.housingAllowanceCents,
        transportAllowanceCents: salaryStructures.transportAllowanceCents,
        medicalAllowanceCents: salaryStructures.medicalAllowanceCents,
        grossSalaryCents: salaryStructures.grossSalaryCents,
        effectiveFrom: salaryStructures.effectiveFrom,
        effectiveTo: salaryStructures.effectiveTo,
      })
      .from(salaryStructures)
      .leftJoin(employees, eq(salaryStructures.employeeId, employees.id))
      .orderBy(desc(salaryStructures.createdAt)),
    getDb()
      .select({ id: employees.id, fullName: employees.fullName })
      .from(employees)
      .where(eq(employees.status, "active"))
      .orderBy(employees.fullName),
  ]);

  function cents(c: number) {
    return (c / 100).toLocaleString("en-US", { minimumFractionDigits: 0 });
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Payroll</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Salary Structures</h1>
        </div>
        <ModalForm
          title="Create salary structure"
          description="Set up salary components for an employee."
          triggerLabel="Create structure"
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          action={createSalaryStructure}
        >
          <Select label="Employee" name="employeeId" required>
            <option value="">Select employee</option>
            {employeeRows.map((e) => (
              <option key={e.id} value={e.id}>{e.fullName}</option>
            ))}
          </Select>
          <Field name="effectiveFrom" label="Effective from" type="date" required />
          <Field name="effectiveTo" label="Effective to" type="date" />
          <Field name="basicSalaryCents" label="Basic Salary (cents)" type="number" />
          <Field name="housingAllowanceCents" label="Housing Allowance (cents)" type="number" />
          <Field name="transportAllowanceCents" label="Transport Allowance (cents)" type="number" />
          <Field name="medicalAllowanceCents" label="Medical Allowance (cents)" type="number" />
          <Field name="grossSalaryCents" label="Gross Salary (cents)" type="number" />
        </ModalForm>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Config</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Salary Structures</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Employee", "Basic", "Housing", "Transport", "Medical", "Gross", "Effective"]}
            empty="No salary structures yet."
            rows={rows.map((r) => [
              <span key="name" className="font-semibold text-slate-800">{r.employeeName ?? "—"}</span>,
              cents(r.basicSalaryCents),
              cents(r.housingAllowanceCents),
              cents(r.transportAllowanceCents),
              cents(r.medicalAllowanceCents),
              <span key="gross" className="font-bold text-sky-700">{cents(r.grossSalaryCents)}</span>,
              `${r.effectiveFrom}${r.effectiveTo ? ` → ${r.effectiveTo}` : ""}`,
            ])}
          />
        </div>
      </div>
    </div>
  );
}
