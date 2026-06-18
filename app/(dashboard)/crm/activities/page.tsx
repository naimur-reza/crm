import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { addLeadActivity } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Field, Select, TextArea } from "@/components/ui/field";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { leadActivities, leads } from "@/lib/db/schema";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, activityRows, leadRows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(leadActivities)
      .innerJoin(leads, eq(leadActivities.leadId, leads.id))
      .then((r) => r[0]),
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
      .orderBy(desc(leadActivities.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb().select({ id: leads.id, title: leads.title }).from(leads),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Activities</h2>
        <ModalForm
          title="Log activity"
          description="Record a new activity for a lead."
          triggerLabel="Log activity"
          action={addLeadActivity}
        >
          <Select label="Lead" name="leadId" required>
            <option value="">Choose lead</option>
            {leadRows.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.title}
              </option>
            ))}
          </Select>
          <Select label="Type" name="type" required>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
            <option value="follow_up">Follow up</option>
          </Select>
          <Field name="summary" label="Summary" required />
          <Field name="dueAt" label="Due at" type="datetime-local" />
        </ModalForm>
      </div>

      <DataTable
        headers={["Lead", "Type", "Due"]}
        empty="No CRM activities yet."
        rows={activityRows.map((activity) => [
          activity.leadTitle,
          <Badge key="type" tone="purple">
            {activity.type.replace("_", " ")}
          </Badge>,
          activity.dueAt?.toLocaleString() ?? "-",
        ])}
      />
      <Pagination {...pagination} />
    </div>
  );
}
