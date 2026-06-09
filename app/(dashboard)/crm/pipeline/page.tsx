import Link from "next/link";
import { redirect } from "next/navigation";
import { updateLeadStage } from "@/app/actions/crm";
import { PageHeader, Surface } from "@/components/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getPipelineBoard } from "@/lib/db/queries/crm";

function cardTone(status: string, stageName: string) {
  if (status === "won") {
    return { card: "border-emerald-200 bg-emerald-50/80", rail: "bg-emerald-500", badge: "green" as const };
  }
  if (status === "lost") {
    return { card: "border-rose-200 bg-rose-50/80", rail: "bg-rose-500", badge: "red" as const };
  }
  if (stageName === "Proposal") {
    return { card: "border-amber-200 bg-amber-50/80", rail: "bg-amber-500", badge: "amber" as const };
  }
  if (stageName === "Qualified") {
    return { card: "border-violet-200 bg-violet-50/80", rail: "bg-violet-500", badge: "blue" as const };
  }
  if (stageName === "Contacted") {
    return { card: "border-sky-200 bg-sky-50/80", rail: "bg-sky-500", badge: "blue" as const };
  }
  return { card: "border-slate-200 bg-white", rail: "bg-slate-400", badge: "slate" as const };
}

export default async function PipelinePage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "crm")) redirect("/dashboard");

  const { stages } = await getPipelineBoard();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Pipeline"
        description="A stage-by-stage board for seeing deal movement at a glance."
      />
      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        {stages.map((stage) => (
          <Surface key={stage.id} className="min-h-64 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">{stage.name}</h2>
                <p className="text-xs text-slate-500">{stage.probability}% probability</p>
              </div>
              <Badge tone={stage.isWon ? "green" : stage.isLost ? "red" : "slate"}>
                {stage.leads.length}
              </Badge>
            </div>
            <div className="grid gap-3">
              {stage.leads.map((lead) => {
                const tone = cardTone(lead.status, stage.name);
                return (
                  <div
                    key={lead.id}
                    className={`relative flex h-44 flex-col overflow-hidden rounded-xl border p-3 shadow-sm ${tone.card}`}
                  >
                    <div className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} />
                    <div className="min-w-0 pl-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950 transition hover:text-[#3995d2]"
                          title={lead.title}
                        >
                          {lead.title}
                        </Link>
                        <Badge tone={tone.badge}>{lead.status}</Badge>
                      </div>
                      <p className="mt-2 truncate text-xs text-slate-500" title={lead.companyName || "No company"}>
                        {lead.companyName || "No company"}
                      </p>
                      <p className="mt-2 truncate text-xs text-slate-500" title={lead.ownerName ?? "Unassigned"}>
                        {lead.ownerName ?? "Unassigned"}
                      </p>
                    </div>
                    <ToastActionForm
                      action={updateLeadStage}
                      successMessage="Lead moved."
                      className="mt-auto flex gap-2 pl-2"
                    >
                      <input type="hidden" name="leadId" value={lead.id} />
                      <select
                        name="stageId"
                        defaultValue={lead.stageId ?? ""}
                        className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-xs"
                      >
                        {stages.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <ActionButton size="xs">Move</ActionButton>
                    </ToastActionForm>
                  </div>
                );
              })}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
