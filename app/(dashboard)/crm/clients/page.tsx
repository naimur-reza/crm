import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { createClient } from "@/app/actions/clients";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { clients, employees } from "@/lib/db/schema";

export default async function CrmClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

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
        <h2 className="text-lg font-semibold text-foreground">Clients</h2>
        <ModalForm
          title="Create client"
          description="Add a new client to the CRM."
          triggerLabel="Create client"
          action={createClient}
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

      <DataTable
        headers={["Client", "Status", "Owner"]}
        empty="No clients yet."
        rows={clientRows.map((client) => [
          <div key="client">
            <Link
              href={`/crm/clients/${client.id}`}
              className="font-medium text-foreground transition hover:text-primary"
            >
              {client.name}
            </Link>
            <p className="text-xs text-muted-foreground">{client.website || client.source || "-"}</p>
          </div>,
          <Badge key="status" tone={client.status === "active" ? "green" : "slate"}>
            {client.status}
          </Badge>,
          client.ownerName ?? "-",
        ])}
      />
      <Pagination {...pagination} />
    </div>
  );
}
