import { redirect } from "next/navigation";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getPipelineBoard } from "@/lib/db/queries/crm";
import { PipelineBoard } from "./pipeline-board";

export default async function PipelinePage() {
  const user = await requireUser();
  if (!canAccess(user, "crm_pipeline")) redirect("/dashboard");

  const { stages } = await getPipelineBoard();

  return (
    <div className="grid gap-6">
      <PipelineBoard stages={stages} />
    </div>
  );
}
