import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addClientContact, addClientInteraction, deleteClient, updateClient } from "@/app/actions/clients";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
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
  if (!canAccess(user, "crm_clients")) redirect("/dashboard");

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
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 ring-1 ring-sky-200">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">{client.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-slate-400">
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
          { label: "Contacts", value: contacts.length, icon: Users, tone: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300" },
          { label: "Leads", value: leads.length, icon: FileText, tone: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300" },
          { label: "Invoices", value: invoices.length, icon: DollarSign, tone: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300" },
          { label: "Billed", value: <Money cents={billedCents} />, icon: CreditCard, tone: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300" },
          { label: "Balance", value: <Money cents={balanceCents} />, icon: CreditCard, tone: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="group relative min-h-28 overflow-hidden rounded-xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{stat.label}</p>
                  <p className="mt-4 text-2xl font-bold leading-none text-slate-800">{stat.value}</p>
                </div>
                <span className={`rounded-xl p-2 ring-1 ${stat.tone}`}><Icon className="h-5 w-5" /></span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <h2 className="font-bold text-slate-800">Account</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center gap-3 border-b border-sky-100 pb-3">
              <Globe className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400 w-16">Source</span>
              <span className="font-semibold text-slate-800">{client.source || "—"}</span>
            </div>
            <div className="flex items-center gap-3 border-b border-sky-100 pb-3">
              <ExternalLink className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400 w-16">Website</span>
              {client.website ? (
                <a href={client.website} target="_blank" rel="noreferrer" className="font-semibold text-sky-600 hover:underline">{client.website}</a>
              ) : <span className="font-semibold text-slate-800">—</span>}
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400 w-16">Created</span>
              <span className="font-semibold text-slate-800">{formatDateTime(client.createdAt)}</span>
            </div>
          </div>
          {client.notes && <p className="mt-4 rounded-xl bg-sky-50 p-4 text-sm text-slate-400">{client.notes}</p>}
        </div>

        <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Contacts</h2>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-slate-400">{contacts.length}</span>
          </div>
          <div className="grid gap-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-sky-100 p-4 transition hover:border-sky-200">
                <p className="font-bold text-slate-800">{contact.name}</p>
                <p className="mt-1 text-sm text-slate-400">{contact.title || "—"}</p>
                {contact.email && <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400"><Mail className="h-3.5 w-3.5" />{contact.email}</p>}
                {contact.phone && <p className="flex items-center gap-1.5 text-sm text-slate-400"><Phone className="h-3.5 w-3.5" />{contact.phone}</p>}
              </div>
            ))}
            {!contacts.length && <p className="py-6 text-center text-sm text-slate-400">No contacts</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <h2 className="font-bold text-slate-800">Timeline</h2>
          <div className="mt-5 grid gap-4">
            {interactions.map((interaction) => (
              <div key={interaction.id} className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400" />
                <div className="min-w-0 flex-1 border-b border-sky-100 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{interaction.type}</Badge>
                    <span className="text-xs text-slate-400">{formatDateTime(interaction.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{interaction.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{interaction.userName || "System"}</p>
                </div>
              </div>
            ))}
            {!interactions.length && <p className="py-6 text-center text-sm text-slate-400">No interactions</p>}
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <h2 className="font-bold text-slate-800">WhatsApp</h2>
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <a key={n.id} href={n.waLink || "#"} target="_blank" rel="noreferrer" className="block rounded-xl border border-sky-100 p-3 text-sm transition hover:border-sky-200">
                <p className="truncate font-bold text-slate-800">{n.recipientName || n.recipientPhone || "Recipient"}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{n.message}</p>
              </a>
            ))}
            {!notifications.length && <p className="py-6 text-center text-sm text-slate-400">No messages</p>}
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Directory</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Linked Leads</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable headers={["Lead", "Stage", "Status"]} empty="No linked leads." rows={leads.map((lead) => [
            <Link key="lead" href={`/crm/leads/${lead.id}`} className="font-bold text-slate-800 hover:text-sky-700">{lead.title}</Link>,
            lead.stageName || "-",
            <Badge key="s" tone={statusTone(lead.status)}>{lead.status}</Badge>,
          ])} />
        </div>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Records</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Invoices</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable headers={["Invoice", "Due", "Status"]} empty="No invoices." rows={invoices.map((inv) => [
            <Link key="i" href={`/crm/invoices/${inv.id}`} className="font-mono text-sm font-bold text-slate-800 hover:text-sky-700">{inv.invoiceNumber}</Link>,
            <DateText key="d" value={inv.dueDate} />,
            <Badge key="s" tone={statusTone(inv.status)}>{inv.status.replace("_", " ")}</Badge>,
          ])} />
        </div>
      </div>
    </div>
  );
}
