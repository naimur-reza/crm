import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { addLeadActivity, convertLeadToClient, deleteLead, updateLeadNotes, updateLeadProfile, updateLeadStage } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader, Surface } from "@/components/page-header";
import { ActionButton } from "@/components/ui/action-button";
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

function statusTone(status: string) {
  if (status === "won") return "green";
  if (status === "lost") return "red";
  return "blue";
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "No date";
  return value.toLocaleString();
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { id } = await params;
  const [
    { lead, contacts, activities, stageHistory, invoices, notifications },
    stages,
    employeeRows,
    workOrderRows,
  ] = await Promise.all([
    getLeadDetail(id),
    getCrmStages(),
    getCrmEmployeeOptions(),
    getDb()
      .select({ id: workOrders.id, workOrderNumber: workOrders.workOrderNumber })
      .from(workOrders)
      .where(eq(workOrders.leadId, id))
      .limit(1),
  ]);

  if (!lead) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader
        title={lead.title}
        description={lead.companyName || "Lead workspace with timeline, contacts, invoices, and communication history."}
        backHref="/crm/leads"
        action={
          <div className="flex flex-wrap gap-2">
            <ModalForm
              title="Edit lead"
              description="Update discovery fields as the opportunity becomes clearer."
              triggerLabel="Edit lead"
              action={updateLeadProfile}
              submitLabel="Save lead"
              formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4"
            >
              <input type="hidden" name="leadId" value={lead.id} />
              <Field label="Lead title" name="title" defaultValue={lead.title} required />
              <Field label="Company" name="companyName" defaultValue={lead.companyName ?? ""} />
              <Field label="Source" name="source" defaultValue={lead.source ?? ""} />
              <Field
                label="Estimated value"
                name="value"
                type="number"
                step="0.01"
                defaultValue={String((lead.valueCents ?? 0) / 100 || "")}
                placeholder="Optional"
                hint="Use a rough estimate until proposal or invoice value is known."
              />
              <Select label="Owner" name="ownerEmployeeId" defaultValue={lead.ownerEmployeeId ?? ""}>
                <option value="">Unassigned</option>
                {employeeRows.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
              <Field label="Expected close" name="expectedCloseDate" type="date" defaultValue={lead.expectedCloseDate ?? ""} />
            </ModalForm>
            <ModalForm
              title="Add activity"
              description="Record a call, meeting, WhatsApp note, or follow-up for this lead."
              triggerLabel="Add activity"
              action={addLeadActivity}
              submitLabel="Save activity"
              formClassName="grid gap-x-6 gap-y-5"
            >
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
            <ToastActionForm action={convertLeadToClient} successMessage="Lead converted to client.">
              <input type="hidden" name="leadId" value={lead.id} />
              <ActionButton variant="secondary">Convert</ActionButton>
            </ToastActionForm>
            <DeleteButton
              action={deleteLead}
              id={lead.id}
              label="Delete lead"
              confirmMessage="Delete this lead and its contacts, activities, and stage history? Linked invoices will remain but no longer point to this lead."
              redirectTo="/crm/leads"
            />
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Surface className="p-5">
          <div className="grid gap-5 md:grid-cols-4">
            {[
              ["Stage", lead.stageName || "No stage"],
              ["Owner", lead.ownerName || "Unassigned"],
              ["Source", lead.source || "Unknown"],
              ["Client", lead.clientName || "Not converted"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated value</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                <Money cents={lead.valueCents} />
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected close</p>
              <p className="mt-2 font-semibold text-slate-950">
                <DateText value={lead.expectedCloseDate} />
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <div className="mt-2">
                <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Lead notes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Discovery summary, pain points, budget context, and important internal notes.
                </p>
              </div>
              <ModalForm
                title="Edit lead notes"
                description="Update the high-level discovery summary for this lead."
                triggerLabel="Edit notes"
                action={updateLeadNotes}
                submitLabel="Save notes"
                formClassName="grid gap-x-6 gap-y-5"
              >
                <input type="hidden" name="leadId" value={lead.id} />
                <TextArea
                  label="Notes"
                  name="notes"
                  defaultValue={lead.notes ?? ""}
                  placeholder="Pain points, requirements, decision makers, budget hints, objections, and next steps."
                />
              </ModalForm>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {lead.notes || "No lead notes yet."}
            </p>
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">Move stage</h2>
          <ToastActionForm
            action={updateLeadStage}
            successMessage="Lead stage updated."
            className="mt-4 grid gap-3"
          >
            <input type="hidden" name="leadId" value={lead.id} />
            <select
              name="stageId"
              defaultValue={lead.stageId ?? ""}
              className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#3995d2] focus:ring-2 focus:ring-[#3995d2]/15"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <ActionButton>Save stage</ActionButton>
          </ToastActionForm>

          {workOrderRows[0] ? (
            <Link
              href={`/work-orders/${workOrderRows[0].id}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#3995d2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2f80bd]"
            >
              View {workOrderRows[0].workOrderNumber}
            </Link>
          ) : null}
        </Surface>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">Contacts</h2>
          <div className="mt-4 grid gap-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-medium text-slate-950">{contact.name}</p>
                <p className="mt-1 text-sm text-slate-500">{contact.title || "No title"}</p>
                <p className="mt-3 text-sm text-slate-600">{contact.email || "No email"}</p>
                <p className="text-sm text-slate-600">{contact.whatsappNumber || contact.phone || "No phone"}</p>
              </div>
            ))}
            {!contacts.length ? <p className="text-sm text-slate-500">No contacts yet.</p> : null}
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">Timeline</h2>
          <div className="mt-5 grid gap-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-[#3995d2]" />
                <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={activity.type === "whatsapp" ? "green" : "blue"}>{activity.type}</Badge>
                    <span className="text-xs text-slate-500">{formatDateTime(activity.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{activity.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">{activity.userName || "System"}</p>
                </div>
              </div>
            ))}
            {!activities.length ? <p className="text-sm text-slate-500">No activity yet.</p> : null}
          </div>
        </Surface>
      </section>

      <DataTable
        headers={["Invoice", "Due", "Total", "Paid", "Status"]}
        empty="No invoices connected to this lead yet."
        rows={invoices.map((invoice) => [
          <span key="number" className="font-mono text-sm font-semibold text-slate-950">
            {invoice.invoiceNumber}
          </span>,
          <DateText key="due" value={invoice.dueDate} />,
          <Money key="total" cents={invoice.totalCents} />,
          <Money key="paid" cents={invoice.paidCents} />,
          <Badge key="status" tone={invoice.status === "paid" ? "green" : "blue"}>
            {invoice.status.replace("_", " ")}
          </Badge>,
        ])}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">Stage history</h2>
          <div className="mt-4 grid gap-3">
            {stageHistory.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <p className="font-medium text-slate-950">Stage updated</p>
                <p className="mt-1 text-slate-500">{formatDateTime(item.createdAt)} by {item.userName || "System"}</p>
              </div>
            ))}
            {!stageHistory.length ? <p className="text-sm text-slate-500">No stage changes yet.</p> : null}
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="font-semibold text-slate-950">WhatsApp logs</h2>
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
    </div>
  );
}
