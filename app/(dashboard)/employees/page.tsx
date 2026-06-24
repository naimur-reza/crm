import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Field, Select } from "@/components/ui/field";
import { createEmployee } from "@/app/actions/employees";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { departments, employees, users } from "@/lib/db/schema";
import { EmployeeActions } from "./employee-actions";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "employees")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, rows, userRows, departmentRows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .then((r) => r[0]),
    getDb()
      .select({
        id: employees.id,
        fullName: employees.fullName,
        email: employees.email,
        phone: employees.phone,
        designation: employees.designation,
        joiningDate: employees.joiningDate,
        userId: employees.userId,
        departmentId: employees.departmentId,
        status: employees.status,
        departmentName: departments.name,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .orderBy(desc(employees.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users),
    getDb()
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .orderBy(departments.name),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Team</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Employees</h1>
        </div>
        <ModalForm
          title="Create employee"
          description="Add a new employee to the organization."
          triggerLabel="Create employee"
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          action={createEmployee}
        >
          <Field name="fullName" label="Full name" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="phone" label="Phone" />
          <Field name="designation" label="Designation" required />
          <Field name="joiningDate" label="Joining date" type="date" />
          <Select label="Department" name="departmentId">
            <option value="">No department</option>
            {departmentRows.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
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

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Roster</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Employee Records</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Name", "Email", "Designation", "Department", "Status", "Action"]}
            empty="No employees yet."
            rows={rows.map((employee) => [
              <span key="name" className="font-bold text-slate-800">
                {employee.fullName}
              </span>,
              employee.email,
              employee.designation,
              <span key="dept" className="text-sm text-muted-foreground">
                {employee.departmentName ?? "-"}
              </span>,
              <span key="status" className="font-semibold text-sky-600">
                {employee.status.replace("_", " ")}
              </span>,
              <EmployeeActions key="action" employee={employee} userRows={userRows} departmentRows={departmentRows} />,
            ])}
          />
          <Pagination {...pagination} />
        </div>
      </div>
    </div>
  );
}
