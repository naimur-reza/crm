import { redirect } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import { createNotificationTemplate } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Field, TextArea } from "@/components/ui/field";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notificationLogs, notificationTemplates } from "@/lib/db/schema";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "crm_templates")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, templates] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationTemplates)
      .then((r) => r[0]),
    getDb()
      .select()
      .from(notificationTemplates)
      .orderBy(notificationTemplates.name)
      .limit(pageSize)
      .offset(offset),
  ]);

  const logs = await getDb()
    .select()
    .from(notificationLogs)
    .orderBy(desc(notificationLogs.createdAt))
    .limit(20);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">CRM</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Templates</h1>
        </div>
        <ModalForm
          title="Create template"
          description="Add a new notification template for WhatsApp messaging."
          triggerLabel="Create template"
          action={createNotificationTemplate}
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
        >
          <Field name="key" label="Key" required />
          <Field name="name" label="Name" required />
          <TextArea name="body" label="Body" required />
        </ModalForm>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Templates</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Message Templates</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Name", "Key", "Channel", "Actions"]}
            empty="No templates yet."
            rows={templates.map((template) => [
              template.name,
              <span key="key" className="font-mono text-xs">{template.key}</span>,
              <Badge key="channel" tone="green">{template.channel}</Badge>,
              <ModalForm
                key="edit"
                title="Edit template"
                description="Update the WhatsApp template name, key, and dynamic message body."
                triggerLabel="Edit"
                action={createNotificationTemplate}
                submitLabel="Update template"
                formClassName="grid gap-x-6 gap-y-5"
              >
                <Field label="Key" name="key" defaultValue={template.key} required />
                <Field label="Name" name="name" defaultValue={template.name} required />
                <TextArea
                  label="Body"
                  name="body"
                  defaultValue={template.body}
                  required
                />
              </ModalForm>,
            ])}
          />
          <Pagination {...pagination} />
        </div>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Logs</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Notification Logs</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Recipient", "Status"]}
            empty="No notification logs yet."
            rows={logs.map((log) => [
              log.recipientName || log.recipientPhone || "-",
              <Badge key="status" tone="blue">{log.status}</Badge>,
            ])}
          />
        </div>
      </div>
    </div>
  );
}
