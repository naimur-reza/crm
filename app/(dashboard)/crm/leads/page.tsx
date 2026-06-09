import Link from "next/link";
import { redirect } from "next/navigation";
import { createLead, convertLeadToClient, updateLeadStage } from "@/app/actions/crm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { DateText, Money } from "@/components/ui/format";
import { Field, Select, TextArea } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getCrmEmployeeOptions, getCrmLeadList, getCrmStages } from "@/lib/db/queries/crm";

function statusTone(status: string) {
  if (status === "won") return "green";
  if (status === "lost") return "red";
  return "blue";
}

export default async function LeadsPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const [leadRows, stageRows, employeeRows] = await Promise.all([
    getCrmLeadList(),
    getCrmStages(),
    getCrmEmployeeOptions(),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Leads"
        description="Capture opportunities, assign owners, and move every deal through a visible CRM pipeline."
        action={
          <ModalForm
            title="New lead"
            description="Add the lead and contact first. Estimated value can stay empty until the lead is qualified."
            triggerLabel="New lead"
            action={createLead}
            submitLabel="Create lead"
            formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Field label="Lead title" name="title" required />
            <Field label="Company" name="companyName" />
            <Field label="Source" name="source" />
            <Field
              label="Estimated value"
              name="value"
              type="number"
              step="0.01"
              placeholder="Optional"
              hint="Use only when you have a rough budget, package, quote, or expected deal size."
            />
            <Select label="Stage" name="stageId">
              <option value="">First stage</option>
              {stageRows.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </Select>
            <Select label="Owner" name="ownerEmployeeId">
              <option value="">Unassigned</option>
              {employeeRows.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </Select>
            <Field label="Expected close" name="expectedCloseDate" type="date" />
            <Field label="Contact name" name="contactName" />
            <Field label="Contact email" name="contactEmail" type="email" />
            <Field label="Contact phone" name="contactPhone" />
            <Field label="WhatsApp" name="whatsappNumber" />
            <div className="lg:col-span-4">
              <TextArea label="Notes" name="notes" />
            </div>
          </ModalForm>
        }
      />
      <DataTable
        headers={["Lead", "Stage", "Owner", "Est. value", "Close date", "Status", "Actions"]}
        empty="No leads yet."
        rows={leadRows.map((lead) => [
          <div key="lead">
            <Link
              href={`/crm/leads/${lead.id}`}
              className="font-medium text-slate-950 transition hover:text-[#3995d2]"
            >
              {lead.title}
            </Link>
            <p className="text-xs text-slate-500">{lead.companyName || lead.source || "No company"}</p>
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
              className="h-9 rounded-md border border-slate-300 px-2 text-sm"
            >
              {stageRows.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
            <ActionButton>Save</ActionButton>
          </ToastActionForm>,
          lead.ownerName ?? "-",
          <Money key="value" cents={lead.valueCents} />,
          <DateText key="date" value={lead.expectedCloseDate} />,
          <Badge key="status" tone={statusTone(lead.status)}>
            {lead.status}
          </Badge>,
          <ToastActionForm
            key="convert"
            action={convertLeadToClient}
            successMessage="Lead converted to client."
          >
            <input type="hidden" name="leadId" value={lead.id} />
            <ActionButton variant="secondary">Convert</ActionButton>
          </ToastActionForm>,
        ])}
      />
    </div>
  );
}
