import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { createLead, logLeadInlineActivity, updateLeadStage } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { Mail, Phone } from "lucide-react";
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
  if (!canAccess(user, "crm_leads")) redirect("/dashboard");

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
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">CRM</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Leads</h1>
        </div>
        <ModalForm
          title="Create lead"
          description="Add a new lead to the CRM pipeline."
          triggerLabel="Create lead"
          action={createLead}
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
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
          <div className="col-span-full border-t border-sky-100 pt-4">
            <p className="mb-3 text-sm font-bold text-slate-800">Primary contact</p>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field name="contactName" label="Contact name" />
              <Field name="contactEmail" label="Contact email" type="email" />
              <Field name="contactPhone" label="Contact phone" />
              <Field name="whatsappNumber" label="WhatsApp number" />
            </div>
          </div>
        </ModalForm>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Directory</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">All Leads</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Lead", "Stage", "Status", "Activity"]}
            empty="No leads yet."
            rows={leadRows.map((lead) => [
              <div key="lead">
                <Link
                  href={`/crm/leads/${lead.id}`}
                  className="font-bold text-slate-800 transition hover:text-sky-700"
                >
                  {lead.title}
                </Link>
                <p className="text-xs text-slate-400">{lead.companyName || lead.source || "No company"}</p>
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
                  className="h-9 rounded-md border border-sky-100 px-2 text-sm"
                >
                  {stageRows.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
                <SubmitButton className="rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] active:scale-[0.98]">Save</SubmitButton>
              </ToastActionForm>,
              <Badge key="status" tone={statusTone(lead.status)}>
                {lead.status}
              </Badge>,
              <div key="activity" className="flex items-center gap-1">
                <ToastActionForm action={logLeadInlineActivity} successMessage="Call logged.">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="type" value="call" />
                  <SubmitButton variant="outline" size="icon-xs">
                    <Phone className="h-3 w-3" />
                  </SubmitButton>
                </ToastActionForm>
                <ToastActionForm action={logLeadInlineActivity} successMessage="Email logged.">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="type" value="email" />
                  <SubmitButton variant="outline" size="icon-xs">
                    <Mail className="h-3 w-3" />
                  </SubmitButton>
                </ToastActionForm>
              </div>,
            ])}
          />
          <Pagination {...pagination} />
        </div>
      </div>
    </div>
  );
}
