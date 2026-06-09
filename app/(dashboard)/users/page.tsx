import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { createUser, deactivateUser } from "@/app/actions/users";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Field, Select } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";

export default async function UsersPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "users")) redirect("/dashboard");

  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      role: roles.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .orderBy(desc(users.createdAt));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Users"
        description="Create login accounts, assign a role, and deactivate users."
        action={
          <ModalForm
            title="New user"
            description="Create a login account and assign its initial permission role."
            triggerLabel="New user"
            action={createUser}
            submitLabel="Create user"
            formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
          >
            <Field label="Name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="Password" name="password" type="password" required />
            <Select label="Role" name="role" defaultValue="employee">
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
              <option value="sales">Sales</option>
            </Select>
          </ModalForm>
        }
      />
      <DataTable
        headers={["Name", "Email", "Role", "Status", "Action"]}
        empty="No users yet."
        rows={rows.map((row) => [
          <span key="name" className="font-medium text-slate-950">
            {row.name}
          </span>,
          row.email,
          row.role ?? "-",
          <span key="status" className="capitalize">
            {row.status}
          </span>,
          row.status === "active" && row.id !== user.id ? (
            <ToastActionForm key="action" action={deactivateUser} successMessage="User deactivated.">
              <input type="hidden" name="id" value={row.id} />
              <ActionButton variant="secondary">Deactivate</ActionButton>
            </ToastActionForm>
          ) : (
            <span key="none" className="text-slate-400">
              -
            </span>
          ),
        ])}
      />
    </div>
  );
}
