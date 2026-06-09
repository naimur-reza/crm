import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addClientContact, addClientInteraction, deleteClient, updateClient } from "@/app/actions/clients";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader, Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { DateText, Money } from "@/components/ui/format";
import { Field, Select, TextArea } from "@/components/ui/field";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getClientDetail, getCrmEmployeeOptions } from "@/lib/db/queries/crm";

function statusTone(status: string) {
  if (status === "active" || status === "won" || status === "paid") return "green";
  if (status === "paused" || status === "partially_paid") return "amber";
  if (status === "closed" || status === "lost" || status === "overdue") return "red";
  return "blue";
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "No date";
  return value.toLocaleString();
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { id } = await params;
  const [{ client, contacts, interactions, leads, invoices, notifications }, employeeRows] =
    await Promise.all([getClientDetail(id), getCrmEmployeeOptions()]);
  if (!client) notFound();

  const paidCents = invoices.reduce((sum, invoice) => sum + invoice.paidCents, 0);
  const billedCents = invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const balanceCents = Math.max(0, billedCents - paidCents);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={client.name}
        description="Client workspace for contacts, communication, opportunities, invoices, and WhatsApp history."
        backHref="/crm/clients"
        action={
          <div className="flex flex-wrap gap-2">
            <ModalForm
              title="Edit client"
              description="Update account ownership, status, source, website, and internal notes."
              triggerLabel="Edit client"
              action={updateClient}
              submitLabel="Save client"
              formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4"
            >
              <input type="hidden" name="clientId" value={client.id} />
              <Field label="Client name" name="name" defaultValue={client.name} required />
              <Select label="Status" name="status" defaultValue={client.status}>
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </Select>
              <Field label="Source" name="source" defaultValue={client.source ?? ""} />
              <Field label="Website" name="website" defaultValue={client.website ?? ""} />
              <Select label="Owner" name="ownerEmployeeId" defaultValue={client.ownerEmployeeId ?? ""}>
                <option value="">Unassigned</option>
                {employeeRows.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
              <div className="xl:col-span-3">
                <TextArea label="Notes" name="notes" defaultValue={client.notes ?? ""} />
              </div>
            </ModalForm>
            <ModalForm
              title="Add contact"
              description={`Add a contact for ${client.name}.`}
              triggerLabel="Add contact"
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
              triggerLabel="Add interaction"
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
            <DeleteButton
              action={deleteClient}
              id={client.id}
              label="Delete client"
              confirmMessage="Delete this client and its contacts/interactions? Linked leads, invoices, tasks, and notifications will remain but no longer point to this client."
              redirectTo="/crm/clients"
            />
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Status", <Badge key="status" tone={statusTone(client.status)}>{client.status}</Badge>],
          ["Owner", client.ownerName || "Unassigned"],
          ["Billed", <Money key="billed" cents={billedCents} />],
          ["Balance", <Money key="balance" cents={balanceCents} />],
        ].map(([label, value]) => (
          <Surface key={String(label)} className="p-5">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
          </Surface>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">Account profile</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
              <span className="text-slate-500">Source</span>
              <span className="font-medium text-slate-950">{client.source || "Unknown"}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
              <span className="text-slate-500">Website</span>
              {client.website ? (
                <a href={client.website} target="_blank" rel="noreferrer" className="font-medium text-[#3995d2]">
                  Open website
                </a>
              ) : (
                <span className="font-medium text-slate-950">Not set</span>
              )}
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Created</span>
              <span className="font-medium text-slate-950">{formatDateTime(client.createdAt)}</span>
            </div>
          </div>
          {client.notes ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{client.notes}</p> : null}
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">Contacts</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-medium text-slate-950">{contact.name}</p>
                <p className="mt-1 text-sm text-slate-500">{contact.title || "No title"}</p>
                <p className="mt-3 text-sm text-slate-600">{contact.email || "No email"}</p>
                <p className="text-sm text-slate-600">{contact.phone || "No phone"}</p>
              </div>
            ))}
            {!contacts.length ? <p className="text-sm text-slate-500">No contacts yet.</p> : null}
          </div>
        </Surface>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">Interaction timeline</h2>
          <div className="mt-5 grid gap-4">
            {interactions.map((interaction) => (
              <div key={interaction.id} className="flex gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-[#3995d2]" />
                <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone="blue">{interaction.type}</Badge>
                    <span className="text-xs text-slate-500">{formatDateTime(interaction.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{interaction.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">{interaction.userName || "System"}</p>
                </div>
              </div>
            ))}
            {!interactions.length ? <p className="text-sm text-slate-500">No interactions yet.</p> : null}
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">WhatsApp history</h2>
          <div className="mt-4 grid max-h-80 gap-3 overflow-y-auto pr-1">
            {notifications.map((notification) => (
              <a
                key={notification.id}
                href={notification.waLink || "#"}
                target="_blank"
                rel="noreferrer"
                className="block h-24 overflow-hidden rounded-xl border border-slate-200 p-4 text-sm transition hover:border-[#3995d2]"
              >
                <p className="truncate font-medium text-slate-950">
                  {notification.recipientName || notification.recipientPhone || "Recipient"}
                </p>
                <p className="mt-1 line-clamp-2 text-slate-500">{notification.message}</p>
              </a>
            ))}
            {!notifications.length ? <p className="text-sm text-slate-500">No WhatsApp messages yet.</p> : null}
          </div>
        </Surface>
      </section>

      <DataTable
        headers={["Lead", "Stage", "Close date", "Est. value", "Status"]}
        empty="No linked leads yet."
        rows={leads.map((lead) => [
          <Link key="lead" href={`/crm/leads/${lead.id}`} className="font-medium text-slate-950 hover:text-[#3995d2]">
            {lead.title}
          </Link>,
          lead.stageName || "-",
          <DateText key="date" value={lead.expectedCloseDate} />,
          <Money key="value" cents={lead.valueCents} />,
          <Badge key="status" tone={statusTone(lead.status)}>{lead.status}</Badge>,
        ])}
      />

      <DataTable
        headers={["Invoice", "Due", "Total", "Paid", "Status"]}
        empty="No invoices yet."
        rows={invoices.map((invoice) => [
          <Link
            key="invoice"
            href={`/crm/invoices/${invoice.id}`}
            className="font-mono text-sm font-semibold text-slate-950 hover:text-[#3995d2]"
          >
            {invoice.invoiceNumber}
          </Link>,
          <DateText key="due" value={invoice.dueDate} />,
          <Money key="total" cents={invoice.totalCents} />,
          <Money key="paid" cents={invoice.paidCents} />,
          <Badge key="status" tone={statusTone(invoice.status)}>{invoice.status.replace("_", " ")}</Badge>,
        ])}
      />
    </div>
  );
}
