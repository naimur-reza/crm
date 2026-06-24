import { Badge } from "@/components/ui/badge";

const statusTone: Record<string, "amber" | "green" | "red" | "slate" | "blue" | "purple"> = {
  draft: "slate",
  pending: "amber",
  approved: "green",
  rejected: "red",
  reimbursed: "blue",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  reimbursed: "Reimbursed",
};

export function ExpenseStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTone[status] ?? "slate"}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}
