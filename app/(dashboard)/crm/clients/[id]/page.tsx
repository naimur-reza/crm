import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addClientContact, addClientInteraction, deleteClient, updateClient } from "@/app/actions/clients";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { DateText, Money } from "@/components/ui/format";
import { Field, Select, TextArea } from "@/components/ui/field";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getClientDetail, getCrmEmployeeOptions } from "@/lib/db/queries/crm";
import { Building2, Globe, Users, FileText, DollarSign, CreditCard, ExternalLink, Mail, Phone, Calendar } from "lucide-react";

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

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { id } = await params;
  const [{ client, contacts, interactions, leads, invoices, notifications }, employeeRows] =
    await Promise.all([getClientDetail(id), getCrmEmployeeOptions()]);
  if (!client) notFound();

  const paidCents = invoices.reduce((sum, i) => sum + i.paidCents, 0);
  const billedCents = invoices.reduce((sum, i) => sum + i.totalCents, 0);
  const balanceCents = Math.max(0, billedCents - paidCents);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{client.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {client.ownerName && <span>{client.ownerName}</span>}
              <Badge tone={statusTone(client.status)}>{client.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModalForm title="Edit client" description="Update account details." triggerLabel="Edit" triggerIcon={<Building2 className="h-4 w-4" />} triggerVariant="outline" action={updateClient} submitLabel="Save" formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="clientId" value={client.id} />
            <Field label="Name" name="name" defaultValue={client.name} required />
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
              {employeeRows.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            <div className="xl:col-span-3"><TextArea label="Notes" name="notes" defaultValue={client.notes ?? ""} /></div>
          </ModalForm>
          <ModalForm title="Add contact" description="Add a contact person." triggerLabel="Contact" triggerIcon={<Users className="h-4 w-4" />} triggerVariant="outline" action={addClientContact} submitLabel="Add" formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <input type="hidden" name="clientId" value={client.id} />
            <Field label="Name" name="name" required />
            <Field label="Title" name="title" />
            <Field label="Email" name="email" type="email" />
            <Field label="Phone" name="phone" />
          </ModalForm>
          <ModalForm title="Add interaction" description="Record a call, email, or meeting." triggerLabel="Log" triggerIcon={<FileText className="h-4 w-4" />} triggerVariant="outline" action={addClientInteraction} submitLabel="Add" formClassName="grid gap-x-6 gap-y-5">
            <input type="hidden" name="clientId" value={client.id} />
            <Select label="Type" name="type" defaultValue="note">
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
            </Select>
            <TextArea label="Summary" name="summary" required />
          </ModalForm>
          <DeleteButton action={deleteClient} id={client.id} label="Delete" confirmMessage="Delete this client and its contacts/interactions?" redirectTo="/crm/clients" />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Contacts", value: contacts.length, icon: Users, tone: "bg-sky-50 text-sky-600" },
          { label: "Leads", value: leads.length, icon: FileText, tone: "bg-violet-50 text-violet-600" },
          { label: "Invoices", value: invoices.length, icon: DollarSign, tone: "bg-emerald-50 text-emerald-600" },
          { label: "Billed", value: <Money cents={billedCents} />, icon: CreditCard, tone: "bg-amber-50 text-amber-600" },
          { label: "Balance", value: <Money cents={balanceCents} />, icon: CreditCard, tone: "bg-rose-50 text-rose-600" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</span>
                <span className={`rounded-lg p-1.5 ${stat.tone}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-5">
          <h2 className="font-semibold text-foreground">Account</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-16">Source</span>
              <span className="font-medium text-foreground">{client.source || "—"}</span>
            </div>
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-16">Website</span>
              {client.website ? (
                <a href={client.website} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{client.website}</a>
              ) : <span className="font-medium text-foreground">—</span>}
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-16">Created</span>
              <span className="font-medium text-foreground">{formatDateTime(client.createdAt)}</span>
            </div>
          </div>
          {client.notes && <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">{client.notes}</p>}
        </Surface>

        <Surface className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Contacts</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{contacts.length}</span>
          </div>
          <div className="grid gap-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-border p-4 transition hover:border-border">
                <p className="font-medium text-foreground">{contact.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{contact.title || "—"}</p>
                {contact.email && <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" />{contact.email}</p>}
                {contact.phone && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" />{contact.phone}</p>}
              </div>
            ))}
            {!contacts.length && <p className="py-6 text-center text-sm text-muted-foreground">No contacts</p>}
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-5">
          <h2 className="font-semibold text-foreground">Timeline</h2>
          <div className="mt-5 grid gap-4">
            {interactions.map((interaction) => (
              <div key={interaction.id} className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1 border-b border-border pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{interaction.type}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(interaction.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{interaction.summary}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{interaction.userName || "System"}</p>
                </div>
              </div>
            ))}
            {!interactions.length && <p className="py-6 text-center text-sm text-muted-foreground">No interactions</p>}
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-foreground">WhatsApp</h2>
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <a key={n.id} href={n.waLink || "#"} target="_blank" rel="noreferrer" className="block rounded-xl border border-border p-3 text-sm transition hover:border-primary">
                <p className="truncate font-medium text-foreground">{n.recipientName || n.recipientPhone || "Recipient"}</p>
                <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">{n.message}</p>
              </a>
            ))}
            {!notifications.length && <p className="py-6 text-center text-sm text-muted-foreground">No messages</p>}
          </div>
        </Surface>
      </section>

      <DataTable headers={["Lead", "Stage", "Status"]} empty="No linked leads." rows={leads.map((lead) => [
        <Link key="lead" href={`/crm/leads/${lead.id}`} className="font-medium text-foreground hover:text-primary">{lead.title}</Link>,
        lead.stageName || "-",
        <Badge key="s" tone={statusTone(lead.status)}>{lead.status}</Badge>,
      ])} />

      <DataTable headers={["Invoice", "Due", "Status"]} empty="No invoices." rows={invoices.map((inv) => [
        <Link key="i" href={`/crm/invoices/${inv.id}`} className="font-mono text-sm font-semibold text-foreground hover:text-primary">{inv.invoiceNumber}</Link>,
        <DateText key="d" value={inv.dueDate} />,
        <Badge key="s" tone={statusTone(inv.status)}>{inv.status.replace("_", " ")}</Badge>,
      ])} />
    </div>
  );
}
