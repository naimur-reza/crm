import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import {
  addClientContact,
  addClientInteraction,
  createClient,
} from "@/app/actions/clients";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { Field, Select, TextArea } from "@/components/ui/field";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { clientContacts, clientInteractions, clients, employees } from "@/lib/db/schema";

export default async function ClientsPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "clients")) redirect("/dashboard");

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
    getDb()
      .select()
      .from(clientInteractions)
      .orderBy(desc(clientInteractions.createdAt)),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Clients"
        description="Track client accounts, contacts, and interaction notes."
        action={
          <ModalForm
            title="New client"
            description="Add a client account, source, owner, and starting notes."
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
        headers={["Client", "Status", "Owner", "Contacts", "Latest interactions", "Add"]}
        empty="No clients yet."
        rows={clientRows.map((client) => {
          const contacts = contactRows.filter((contact) => contact.clientId === client.id);
          const interactions = interactionRows.filter(
            (interaction) => interaction.clientId === client.id,
          );
          return [
            <div key="client">
              <p className="font-medium text-slate-950">{client.name}</p>
              <p className="text-xs text-slate-500">{client.website || client.source || "-"}</p>
            </div>,
            <span key="status" className="capitalize">
              {client.status}
            </span>,
            client.ownerName ?? "-",
            <div key="contacts" className="space-y-1">
              {contacts.slice(0, 2).map((contact) => (
                <p key={contact.id}>{contact.name}</p>
              ))}
              {!contacts.length ? <p className="text-slate-400">No contacts</p> : null}
            </div>,
            <div key="interactions" className="space-y-1">
              {interactions.slice(0, 2).map((interaction) => (
                <p key={interaction.id} className="max-w-xs truncate">
                  {interaction.summary}
                </p>
              ))}
              {!interactions.length ? (
                <p className="text-slate-400">No interactions</p>
              ) : null}
            </div>,
            <div key="forms" className="flex flex-wrap gap-2">
              <ModalForm
                title="Add contact"
                description={`Add a contact person for ${client.name}.`}
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
                description={`Record a call, meeting, email, or note for ${client.name}.`}
                triggerLabel="Interaction"
                action={addClientInteraction}
                submitLabel="Add interaction"
                formClassName="grid gap-x-6 gap-y-5"
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
