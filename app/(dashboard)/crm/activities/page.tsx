import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { addLeadActivity } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Field, Select, TextArea } from "@/components/ui/field";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { leadActivities, leads } from "@/lib/db/schema";

export default async function ActivitiesPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const [activityRows, leadRows] = await Promise.all([
    getDb()
      .select({
        id: leadActivities.id,
        type: leadActivities.type,
        summary: leadActivities.summary,
        dueAt: leadActivities.dueAt,
        completedAt: leadActivities.completedAt,
        createdAt: leadActivities.createdAt,
        leadTitle: leads.title,
      })
      .from(leadActivities)
      .innerJoin(leads, eq(leadActivities.leadId, leads.id))
      .orderBy(desc(leadActivities.createdAt)),
    getDb().select({ id: leads.id, title: leads.title }).from(leads),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="CRM activities"
        description="Track calls, notes, meetings, WhatsApp touches, and follow-up reminders."
        action={
          <ModalForm
            title="New activity"
            description="Attach a CRM activity to a lead."
            triggerLabel="New activity"
            action={addLeadActivity}
            submitLabel="Add activity"
            formClassName="grid gap-x-6 gap-y-5"
          >
            <Select label="Lead" name="leadId" required>
              <option value="">Choose lead</option>
              {leadRows.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.title}
                </option>
              ))}
            </Select>
            <Select label="Type" name="type" defaultValue="note">
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="follow_up">Follow-up</option>
            </Select>
            <Field label="Due at" name="dueAt" type="datetime-local" />
            <TextArea label="Summary" name="summary" required />
          </ModalForm>
        }
      />
      <DataTable
        headers={["Lead", "Type", "Summary", "Due", "Created"]}
        empty="No CRM activities yet."
        rows={activityRows.map((activity) => [
          activity.leadTitle,
          <Badge key="type" tone="purple">
            {activity.type.replace("_", " ")}
          </Badge>,
          activity.summary,
          activity.dueAt?.toLocaleString() ?? "-",
          activity.createdAt.toLocaleString(),
        ])}
      />
    </div>
  );
}
