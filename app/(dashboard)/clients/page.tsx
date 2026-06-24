import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { createClient } from "@/app/actions/clients";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Field, Select } from "@/components/ui/field";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { clients, employees } from "@/lib/db/schema";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "clients")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, clientRows, employeeRows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(clients)
      .leftJoin(employees, eq(clients.ownerEmployeeId, employees.id))
      .then((r) => r[0]),
    getDb()
      .select({
        id: clients.id,
        name: clients.name,
        status: clients.status,
        source: clients.source,
        website: clients.website,
        ownerName: employees.fullName,
      })
      .from(clients)
      .leftJoin(employees, eq(clients.ownerEmployeeId, employees.id))
      .orderBy(desc(clients.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb().select({ id: employees.id, name: employees.fullName }).from(employees),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Accounts</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Clients</h1>
        </div>
        <ModalForm
          title="Create client"
          description="Add a new client."
          triggerLabel="Create client"
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          action={createClient}
          formClassName="grid grid-cols-2 gap-x-6 gap-y-5"
        >
          <Field name="name" label="Name" required />
          <Select label="Status" name="status" required>
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </Select>
          <Field name="source" label="Source" />
          <Field name="website" label="Website" />
          <Select label="Owner" name="ownerEmployeeId">
            <option value="">No owner</option>
            {employeeRows.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
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
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Register</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Client Records</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Client", "Status", "Owner"]}
            empty="No clients yet."
            rows={clientRows.map((client) => [
              <div key="client">
                <p className="font-bold text-slate-800">{client.name}</p>
                <p className="text-xs text-muted-foreground">{client.website || client.source || "-"}</p>
              </div>,
              <span key="status" className="font-semibold text-sky-600">
                {client.status}
              </span>,
              client.ownerName ?? "-",
            ])}
          />
          <Pagination {...pagination} />
        </div>
      </div>
    </div>
  );
}
