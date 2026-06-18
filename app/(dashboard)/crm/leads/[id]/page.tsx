import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { addLeadActivity, convertLeadToClient, deleteLead, updateLeadNotes, updateLeadProfile, updateLeadStage } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader, Surface } from "@/components/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { DateText, Money } from "@/components/ui/format";
import { Field, Select, TextArea } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { workOrders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCrmEmployeeOptions, getCrmStages, getLeadDetail } from "@/lib/db/queries/crm";
import { Target, User, Globe, Building2, DollarSign, Calendar, Activity, MessageSquare } from "lucide-react";

function statusTone(status: string) {
  if (status === "won") return "green";
  if (status === "lost") return "red";
  return "blue";
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "";
  return value.toLocaleString();
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { id } = await params;
  const [{ lead, contacts, activities, stageHistory, invoices, notifications }, stages, employeeRows, workOrderRows] =
    await Promise.all([
      getLeadDetail(id), getCrmStages(), getCrmEmployeeOptions(),
      getDb().select({ id: workOrders.id, workOrderNumber: workOrders.workOrderNumber }).from(workOrders).where(eq(workOrders.leadId, id)).limit(1),
    ]);
  if (!lead) notFound();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Target className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{lead.title}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {lead.companyName && <span>{lead.companyName}</span>}
              {lead.stageName && <Badge tone="blue">{lead.stageName}</Badge>}
              <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModalForm title="Edit lead" description="Update lead details." triggerLabel="Edit" triggerIcon={<Target className="h-4 w-4" />} triggerVariant="outline" action={updateLeadProfile} submitLabel="Save" formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="leadId" value={lead.id} />
            <Field label="Title" name="title" defaultValue={lead.title} required />
            <Field label="Company" name="companyName" defaultValue={lead.companyName ?? ""} />
            <Field label="Source" name="source" defaultValue={lead.source ?? ""} />
            <Field label="Est. value" name="value" type="number" step="0.01" defaultValue={String((lead.valueCents ?? 0) / 100 || "")} />
            <Select label="Owner" name="ownerEmployeeId" defaultValue={lead.ownerEmployeeId ?? ""}>
              <option value="">Unassigned</option>
              {employeeRows.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            <Field label="Close date" name="expectedCloseDate" type="date" defaultValue={lead.expectedCloseDate ?? ""} />
          </ModalForm>
          <ModalForm title="Add activity" description="Record a call, meeting, or note." triggerLabel="Log" triggerIcon={<Activity className="h-4 w-4" />} triggerVariant="outline" action={addLeadActivity} submitLabel="Save" formClassName="grid gap-x-6 gap-y-5">
            <input type="hidden" name="leadId" value={lead.id} />
            <Select label="Type" name="type" defaultValue="note">
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="follow_up">Follow-up</option>
            </Select>
            <TextArea label="Summary" name="summary" required />
          </ModalForm>
          <ToastActionForm action={convertLeadToClient} successMessage="Lead converted.">
            <input type="hidden" name="leadId" value={lead.id} />
            <SubmitButton>Convert</SubmitButton>
          </ToastActionForm>
          <DeleteButton action={deleteLead} id={lead.id} label="Delete" confirmMessage="Delete this lead and its data?" redirectTo="/crm/leads" />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Est. Value", value: <Money cents={lead.valueCents} />, icon: DollarSign, tone: "bg-emerald-50 text-emerald-600" },
          { label: "Close Date", value: lead.expectedCloseDate ? <DateText value={lead.expectedCloseDate} /> : "—", icon: Calendar, tone: "bg-amber-50 text-amber-600" },
          { label: "Activities", value: activities.length, icon: Activity, tone: "bg-sky-50 text-sky-600" },
          { label: "Contacts", value: contacts.length, icon: User, tone: "bg-violet-50 text-violet-600" },
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

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Surface className="p-5">
          <div className="grid gap-5 md:grid-cols-4">
            {[
              { label: "Stage", value: lead.stageName || "—", icon: Target },
              { label: "Owner", value: lead.ownerName || "Unassigned", icon: User },
              { label: "Source", value: lead.source || "—", icon: Globe },
              { label: "Client", value: lead.clientName || "—", icon: Building2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl bg-muted p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{item.value}</p>
                </div>
              );
            })}
          </div>
          {lead.notes && (
            <div className="mt-5 rounded-xl bg-muted p-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-foreground">Stage</h2>
          <ToastActionForm action={updateLeadStage} successMessage="Stage updated." className="mt-4 grid gap-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <select name="stageId" defaultValue={lead.stageId ?? ""} className="h-11 rounded-lg border border-border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <SubmitButton>Update</SubmitButton>
          </ToastActionForm>
          {workOrderRows[0] && (
            <Link href={`/work-orders/${workOrderRows[0].id}`} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80">
              View {workOrderRows[0].workOrderNumber}
            </Link>
          )}
          <div className="mt-5">
            <ModalForm title="Edit notes" description="Update lead notes." triggerLabel="Edit notes" action={updateLeadNotes} submitLabel="Save" formClassName="grid gap-x-6 gap-y-5">
              <input type="hidden" name="leadId" value={lead.id} />
              <TextArea label="Notes" name="notes" defaultValue={lead.notes ?? ""} />
            </ModalForm>
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Surface className="p-5">
          <h2 className="font-semibold text-foreground">Contacts</h2>
          <div className="mt-4 grid gap-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-border p-4">
                <p className="font-medium text-foreground">{contact.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{contact.title || "—"}</p>
                {contact.email && <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" />{contact.email}</p>}
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">{contact.whatsappNumber || contact.phone || "—"}</p>
              </div>
            ))}
            {!contacts.length && <p className="py-6 text-center text-sm text-muted-foreground">No contacts</p>}
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-foreground">Timeline</h2>
          <div className="mt-5 grid gap-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1 border-b border-border pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={activity.type === "whatsapp" ? "green" : "blue"}>{activity.type}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{activity.summary}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{activity.userName || "System"}</p>
                </div>
              </div>
            ))}
            {!activities.length && <p className="py-6 text-center text-sm text-muted-foreground">No activity</p>}
          </div>
        </Surface>
      </section>

      <DataTable headers={["Invoice", "Due", "Status"]} empty="No invoices." rows={invoices.map((inv) => [
        <span key="n" className="font-mono text-sm font-semibold text-foreground">{inv.invoiceNumber}</span>,
        <DateText key="d" value={inv.dueDate} />,
        <Badge key="s" tone={inv.status === "paid" ? "green" : "blue"}>{inv.status.replace("_", " ")}</Badge>,
      ])} />

      <section className="grid gap-6 xl:grid-cols-2">
        <Surface className="p-5">
          <h2 className="font-semibold text-foreground">Stage History</h2>
          <div className="mt-4 grid gap-3">
            {stageHistory.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-4 text-sm">
                <p className="font-medium text-foreground">Stage updated</p>
                <p className="mt-1 text-muted-foreground">{formatDateTime(item.createdAt)} by {item.userName || "System"}</p>
              </div>
            ))}
            {!stageHistory.length && <p className="py-6 text-center text-sm text-muted-foreground">No changes</p>}
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-foreground">WhatsApp</h2>
          <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <a key={n.id} href={n.waLink || "#"} target="_blank" rel="noreferrer" className="block rounded-xl border border-border p-3 text-sm transition hover:border-primary">
                <p className="truncate font-medium text-foreground">{n.recipientName || n.recipientPhone || "Recipient"}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
              </a>
            ))}
            {!notifications.length && <p className="py-6 text-center text-sm text-muted-foreground">No messages</p>}
          </div>
        </Surface>
      </section>
    </div>
  );
}
