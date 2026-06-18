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
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

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
        <h2 className="text-lg font-semibold text-foreground">Templates</h2>
        <ModalForm
          title="Create template"
          description="Add a new notification template for WhatsApp messaging."
          triggerLabel="Create template"
          action={createNotificationTemplate}
        >
          <Field name="key" label="Key" required />
          <Field name="name" label="Name" required />
          <TextArea name="body" label="Body" required />
        </ModalForm>
      </div>

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
      <DataTable
        headers={["Recipient", "Status"]}
        empty="No notification logs yet."
        rows={logs.map((log) => [
          log.recipientName || log.recipientPhone || "-",
          <Badge key="status" tone="blue">{log.status}</Badge>,
        ])}
      />
    </div>
  );
}
