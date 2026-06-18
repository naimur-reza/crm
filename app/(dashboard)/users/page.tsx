import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { createUser } from "@/app/actions/users";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Field, Select } from "@/components/ui/field";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import { UserActions } from "./user-actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "users")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, rows, roleRows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .then((r) => r[0]),
    getDb()
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
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb().select({ id: roles.id, name: roles.name, label: roles.label }).from(roles),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Users</h2>
        <ModalForm
          title="Create user"
          description="Add a new user account with role-based access."
          triggerLabel="Create user"
          action={createUser}
        >
          <Field name="name" label="Name" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="password" label="Password" type="password" required />
          <Select label="Role" name="role" required>
            <option value="">Choose role</option>
            {roleRows.map((role) => (
              <option key={role.id} value={role.name}>
                {role.label}
              </option>
            ))}
          </Select>
        </ModalForm>
      </div>

      <DataTable
        headers={["Name", "Email", "Role", "Status", "Action"]}
        empty="No users yet."
        rows={rows.map((row) => [
          <span key="name" className="font-medium text-foreground">
            {row.name}
          </span>,
          row.email,
          row.role ?? "-",
          <span key="status" className="capitalize">
            {row.status}
          </span>,
          <UserActions key="action" row={row} isCurrentUser={row.id === user.id} />,
        ])}
      />
      <Pagination {...pagination} />
    </div>
  );
}
