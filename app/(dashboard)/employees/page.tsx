import { redirect } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Field, Select } from "@/components/ui/field";
import { createEmployee } from "@/app/actions/employees";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { employees, users } from "@/lib/db/schema";
import { EmployeeActions } from "./employee-actions";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "employees")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, rows, userRows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .then((r) => r[0]),
    getDb()
      .select()
      .from(employees)
      .orderBy(desc(employees.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Employees</h2>
        <ModalForm
          title="Create employee"
          description="Add a new employee to the organization."
          triggerLabel="Create employee"
          action={createEmployee}
        >
          <Field name="fullName" label="Full name" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="phone" label="Phone" />
          <Field name="designation" label="Designation" required />
          <Field name="joiningDate" label="Joining date" type="date" />
          <Select label="Link user account" name="userId">
            <option value="">No account</option>
            {userRows.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </Select>
        </ModalForm>
      </div>

      <DataTable
        headers={["Name", "Email", "Designation", "Status", "Action"]}
        empty="No employees yet."
        rows={rows.map((employee) => [
          <span key="name" className="font-medium text-foreground">
            {employee.fullName}
          </span>,
          employee.email,
          employee.designation,
          <span key="status" className="capitalize">
            {employee.status.replace("_", " ")}
          </span>,
          <EmployeeActions key="action" employee={employee} userRows={userRows} />,
        ])}
      />
      <Pagination {...pagination} />
    </div>
  );
}
