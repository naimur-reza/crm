import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Field, Select } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import {
  createDeductionDefinition,
  deleteDeductionDefinition,
} from "@/app/actions/payroll";
import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { deductionDefinitions } from "@/lib/db/schema";

export default async function DeductionsPage() {
  const user = await requireUser();
  if (!canAccess(user, "payroll")) redirect("/dashboard");

  const rows = await getDb()
    .select()
    .from(deductionDefinitions)
    .orderBy(desc(deductionDefinitions.createdAt));

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Payroll</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Deduction Definitions</h1>
        </div>
        <ModalForm
          title="Create deduction"
          description="Define a deduction type (tax, insurance, loan, etc.)."
          triggerLabel="Create deduction"
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          action={createDeductionDefinition}
        >
          <Field name="name" label="Name" required />
          <Field name="code" label="Code" required hint="Unique identifier, e.g. TAX, INSURANCE" />
          <Field name="description" label="Description" />
          <Select label="Category" name="category" required>
            <option value="tax">Tax</option>
            <option value="insurance">Insurance</option>
            <option value="loan">Loan</option>
            <option value="other">Other</option>
          </Select>
          <Select label="Type" name="type" required>
            <option value="fixed">Fixed amount</option>
            <option value="percentage">Percentage of gross</option>
          </Select>
          <Field name="defaultValueCents" label="Default value (cents)" type="number" hint="For fixed deductions" />
          <Field name="defaultRate" label="Default rate (%)" type="number" hint="For percentage deductions (0-100)" />
          <Field name="isMandatory" label="Mandatory" type="checkbox" />
        </ModalForm>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Config</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Deductions</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Name", "Code", "Category", "Type", "Default", "Mandatory", "Action"]}
            empty="No deduction definitions yet."
            rows={rows.map((d) => [
              <span key="name" className="font-semibold text-slate-800">{d.name}</span>,
              <span key="code" className="font-mono text-xs">{d.code}</span>,
              d.category,
              d.type === "percentage" ? `${d.defaultRate}%` : `${d.defaultValueCents}¢`,
              d.type === "percentage" ? `${d.defaultRate}%` : `${d.defaultValueCents}¢`,
              d.isMandatory ? "Yes" : "No",
              <ToastActionForm key="delete" action={deleteDeductionDefinition} successMessage="Deduction deleted.">
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="text-xs text-red-600 hover:underline">Delete</button>
              </ToastActionForm>,
            ])}
          />
        </div>
      </div>
    </div>
  );
}
