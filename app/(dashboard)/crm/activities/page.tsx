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
  if (!canAccess(user, "crm_activities")) redirect("/dashboard");

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
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">CRM</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Activities</h1>
        </div>
        <ModalForm
          title="Log activity"
          description="Record a new activity for a lead."
          triggerLabel="Log activity"
          action={addLeadActivity}
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
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

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">History</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Activity Log</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
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
      </div>
    </div>
  );
}
