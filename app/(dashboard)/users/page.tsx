import { redirect } from "next/navigation";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { createUser } from "@/app/actions/users";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Field, Select } from "@/components/ui/field";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { roles, userPermissions, userRoles, users } from "@/lib/db/schema";
import { UserActions } from "./user-actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "users")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, rawRows, roleRows] = await Promise.all([
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

  const userIds = [...new Set(rawRows.map((r) => r.id))];
  const permRows = userIds.length
    ? await getDb()
        .select({ userId: userPermissions.userId, permission: userPermissions.permission })
        .from(userPermissions)
        .where(inArray(userPermissions.userId, userIds))
    : [];
  const permissionsByUser: Record<string, string[]> = {};
  for (const pr of permRows) {
    if (!permissionsByUser[pr.userId]) permissionsByUser[pr.userId] = [];
    permissionsByUser[pr.userId].push(pr.permission);
  }

  const rows = rawRows;
  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">People</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Users</h1>
        </div>
        <ModalForm
          title="Create user"
          description="Add a new user account with role-based access."
          triggerLabel="Create user"
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
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

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Directory</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">User Accounts</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Name", "Email", "Role", "Status", "Action"]}
            empty="No users yet."
            rows={rows.map((row) => [
              <span key="name" className="font-bold text-slate-800">
                {row.name}
              </span>,
              row.email,
              row.role ?? "-",
              <span key="status" className="font-semibold text-sky-600">
                {row.status}
              </span>,
              <UserActions key="action" row={row} isCurrentUser={row.id === user.id} permissions={permissionsByUser[row.id] ?? []} />,
            ])}
          />
          <Pagination {...pagination} />
        </div>
      </div>
    </div>
  );
}
