import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { createLead, updateLeadStage } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { crmStages, employees, leads } from "@/lib/db/schema";
import { getCrmStages } from "@/lib/db/queries/crm";

function statusTone(status: string) {
  if (status === "won") return "green";
  if (status === "lost") return "red";
  return "blue";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, leadRows, stageRows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .leftJoin(crmStages, eq(leads.stageId, crmStages.id))
      .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id))
      .then((r) => r[0]),
    getDb()
      .select({
        id: leads.id,
        title: leads.title,
        companyName: leads.companyName,
        source: leads.source,
        status: leads.status,
        valueCents: leads.valueCents,
        expectedCloseDate: leads.expectedCloseDate,
        stageId: leads.stageId,
        stageName: crmStages.name,
        ownerName: employees.fullName,
      })
      .from(leads)
      .leftJoin(crmStages, eq(leads.stageId, crmStages.id))
      .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id))
      .orderBy(desc(leads.createdAt))
      .limit(pageSize)
      .offset(offset),
    getCrmStages(),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Leads</h2>
        <ModalForm
          title="Create lead"
          description="Add a new lead to the CRM pipeline."
          triggerLabel="Create lead"
          action={createLead}
        >
          <Field name="title" label="Title" required />
          <Field name="companyName" label="Company name" />
          <Field name="source" label="Source" />
          <Field name="value" label="Value (USD)" type="number" step="0.01" />
          <Field name="expectedCloseDate" label="Expected close date" type="date" />
          <Select label="Stage" name="stageId">
            <option value="">Default stage</option>
            {stageRows.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
          <div className="col-span-full border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium text-foreground">Primary contact</p>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field name="contactName" label="Contact name" />
              <Field name="contactEmail" label="Contact email" type="email" />
              <Field name="contactPhone" label="Contact phone" />
              <Field name="whatsappNumber" label="WhatsApp number" />
            </div>
          </div>
        </ModalForm>
      </div>

      <DataTable
        headers={["Lead", "Stage", "Status"]}
        empty="No leads yet."
        rows={leadRows.map((lead) => [
          <div key="lead">
            <Link
              href={`/crm/leads/${lead.id}`}
              className="font-medium text-foreground transition hover:text-primary"
            >
              {lead.title}
            </Link>
            <p className="text-xs text-muted-foreground">{lead.companyName || lead.source || "No company"}</p>
          </div>,
          <ToastActionForm
            key="stage"
            action={updateLeadStage}
            successMessage="Lead stage updated."
            className="flex items-center gap-2"
          >
            <input type="hidden" name="leadId" value={lead.id} />
            <select
              name="stageId"
              defaultValue={lead.stageId ?? ""}
              className="h-9 rounded-md border border-border px-2 text-sm"
            >
              {stageRows.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <SubmitButton>Save</SubmitButton>
          </ToastActionForm>,
          <Badge key="status" tone={statusTone(lead.status)}>
            {lead.status}
          </Badge>,
        ])}
      />
      <Pagination {...pagination} />
    </div>
  );
}
