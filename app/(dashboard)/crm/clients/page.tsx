import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { addClientContact, addClientInteraction, createClient } from "@/app/actions/clients";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Field, Select, TextArea } from "@/components/ui/field";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { clientContacts, clientInteractions, clients, employees } from "@/lib/db/schema";

export default async function CrmClientsPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const [clientRows, employeeRows, contactRows, interactionRows] = await Promise.all([
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
      .orderBy(desc(clients.createdAt)),
    getDb().select({ id: employees.id, name: employees.fullName }).from(employees),
    getDb().select().from(clientContacts).orderBy(desc(clientContacts.createdAt)),
    getDb().select().from(clientInteractions).orderBy(desc(clientInteractions.createdAt)),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="CRM clients"
        description="Client accounts connected to leads, invoices, and communication history."
        action={
          <ModalForm
            title="New client"
            description="Create a CRM client account."
            triggerLabel="New client"
            action={createClient}
            submitLabel="Create client"
            formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Field label="Client name" name="name" required />
            <Select label="Status" name="status" defaultValue="lead">
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </Select>
            <Field label="Source" name="source" />
            <Field label="Website" name="website" />
            <Select label="Owner" name="ownerEmployeeId">
              <option value="">Unassigned</option>
              {employeeRows.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </Select>
            <div className="lg:col-span-3">
              <TextArea label="Notes" name="notes" />
            </div>
          </ModalForm>
        }
      />
      <DataTable
        headers={["Client", "Status", "Owner", "Contacts", "Interactions", "Quick add"]}
        empty="No clients yet."
        rows={clientRows.map((client) => {
          const contacts = contactRows.filter((contact) => contact.clientId === client.id);
          const interactions = interactionRows.filter((item) => item.clientId === client.id);
          return [
            <div key="client">
              <Link
                href={`/crm/clients/${client.id}`}
                className="font-medium text-slate-950 transition hover:text-[#3995d2]"
              >
                {client.name}
              </Link>
              <p className="text-xs text-slate-500">{client.website || client.source || "-"}</p>
            </div>,
            <Badge key="status" tone={client.status === "active" ? "green" : "slate"}>
              {client.status}
            </Badge>,
            client.ownerName ?? "-",
            contacts[0]?.name ?? "No contacts",
            interactions[0]?.summary ?? "No interactions",
            <div key="add" className="flex flex-wrap gap-2">
              <ModalForm
                title="Add contact"
                description={`Add a contact for ${client.name}.`}
                triggerLabel="Contact"
                action={addClientContact}
                submitLabel="Add contact"
                formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
              >
                <input type="hidden" name="clientId" value={client.id} />
                <Field label="Name" name="name" required />
                <Field label="Title" name="title" />
                <Field label="Email" name="email" type="email" />
                <Field label="Phone" name="phone" />
              </ModalForm>
              <ModalForm
                title="Add interaction"
                description={`Record activity for ${client.name}.`}
                triggerLabel="Interaction"
                action={addClientInteraction}
                submitLabel="Add interaction"
              >
                <input type="hidden" name="clientId" value={client.id} />
                <Select label="Type" name="type" defaultValue="note">
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                </Select>
                <TextArea label="Summary" name="summary" required />
              </ModalForm>
            </div>,
          ];
        })}
      />
    </div>
  );
}
