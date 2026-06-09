import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ModalForm } from "@/components/modal-form";
import { ActionButton } from "@/components/ui/action-button";
import { Field, Select } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { createEmployee, deactivateEmployee, deleteEmployee } from "@/app/actions/employees";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { employees, users } from "@/lib/db/schema";

export default async function EmployeesPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "employees")) redirect("/dashboard");

  const [rows, userRows] = await Promise.all([
    getDb().select().from(employees).orderBy(desc(employees.createdAt)),
    getDb()
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Employees"
        description="Maintain employee profiles and employment status."
        action={
          <ModalForm
            title="New employee"
            description="Create an employee profile and optionally link it to a login account."
            triggerLabel="New employee"
            action={createEmployee}
            submitLabel="Create employee"
            formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
          >
            <Field label="Full name" name="fullName" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="Phone" name="phone" />
            <Field label="Designation" name="designation" required />
            <Field label="Joining date" name="joiningDate" type="date" />
            <Select label="Linked user" name="userId">
              <option value="">No login account</option>
              {userRows.map((userRow) => (
                <option key={userRow.id} value={userRow.id}>
                  {userRow.name} ({userRow.email})
                </option>
              ))}
            </Select>
          </ModalForm>
        }
      />
      <DataTable
        headers={["Name", "Email", "Designation", "Status", "Action"]}
        empty="No employees yet."
        rows={rows.map((employee) => [
          <span key="name" className="font-medium text-slate-950">
            {employee.fullName}
          </span>,
          employee.email,
          employee.designation,
          <span key="status" className="capitalize">
            {employee.status.replace("_", " ")}
          </span>,
          <div key="action" className="flex items-center gap-2">
            {employee.status === "active" ? (
              <ToastActionForm
                action={deactivateEmployee}
                successMessage="Employee deactivated."
              >
                <input type="hidden" name="id" value={employee.id} />
                <ActionButton variant="secondary">Deactivate</ActionButton>
              </ToastActionForm>
            ) : (
              <span className="text-slate-400">Inactive</span>
            )}
            <ToastActionForm
              action={deleteEmployee}
              successMessage="Employee deleted."
            >
              <input type="hidden" name="id" value={employee.id} />
              <button
                type="submit"
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Delete
              </button>
            </ToastActionForm>
          </div>,
        ])}
      />
    </div>
  );
}
