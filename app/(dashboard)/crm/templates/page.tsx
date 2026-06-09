import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { createNotificationTemplate } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Field, TextArea } from "@/components/ui/field";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notificationLogs, notificationTemplates } from "@/lib/db/schema";

export default async function TemplatesPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const [templates, logs] = await Promise.all([
    getDb().select().from(notificationTemplates).orderBy(notificationTemplates.name),
    getDb().select().from(notificationLogs).orderBy(desc(notificationLogs.createdAt)).limit(20),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="WhatsApp templates"
        description="Reusable click-to-send WhatsApp message templates with CRM variables."
        action={
          <ModalForm
            title="Template"
            description="Create or update a reusable WhatsApp message template."
            triggerLabel="New template"
            action={createNotificationTemplate}
            submitLabel="Save template"
            formClassName="grid gap-x-6 gap-y-5"
          >
            <Field label="Key" name="key" placeholder="invoice_reminder" required />
            <Field label="Name" name="name" required />
            <TextArea
              label="Body"
              name="body"
              required
              placeholder="Hello {client_name}, invoice {invoice_number} is due on {due_date}."
            />
          </ModalForm>
        }
      />
      <DataTable
        headers={["Name", "Key", "Channel", "Body", "Actions"]}
        empty="No templates yet."
        rows={templates.map((template) => [
          template.name,
          <span key="key" className="font-mono text-xs">{template.key}</span>,
          <Badge key="channel" tone="green">{template.channel}</Badge>,
          <span key="body" className="line-clamp-2 max-w-2xl">{template.body}</span>,
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
      <DataTable
        headers={["Recipient", "Status", "Message", "Link"]}
        empty="No notification logs yet."
        rows={logs.map((log) => [
          log.recipientName || log.recipientPhone || "-",
          <Badge key="status" tone="blue">{log.status}</Badge>,
          <span key="message" className="line-clamp-2 max-w-2xl">{log.message}</span>,
          log.waLink ? (
            <a key="link" href={log.waLink} target="_blank" rel="noreferrer" className="font-medium text-slate-950">
              Open
            </a>
          ) : "-",
        ])}
      />
    </div>
  );
}
