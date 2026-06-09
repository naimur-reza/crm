import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CheckCircle2, CircleDashed, ListChecks, Wrench } from "lucide-react";
import { WorkOrderFilters } from "@/components/work-order-filters";
import { PageHeader, Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DateText, Money } from "@/components/ui/format";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getWorkOrderList } from "@/lib/db/queries/work-orders";

function workOrderTone(status: string) {
  if (status === "completed") return "green";
  if (status === "in_progress") return "blue";
  if (status === "cancelled") return "red";
  return "amber";
}

function statusLabel(status: string) {
  return status.replace("_", " ");
}

export default async function WorkOrdersPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "work_orders")) redirect("/dashboard");

  const sp = await props.searchParams;
  const statusFilter = sp.status || "";
  const searchFilter = sp.search || "";

  const rows = await getWorkOrderList({
    status: statusFilter || undefined,
    search: searchFilter || undefined,
  });

  const totalValueCents = rows.reduce((sum, r) => sum + r.totalValueCents, 0);
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const inProgressCount = rows.filter((r) => r.status === "in_progress").length;
  const completedCount = rows.filter((r) => r.status === "completed").length;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Work Orders"
        description="Orders created from won leads, with linked invoices."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Value",
            value: <Money cents={totalValueCents} />,
            helper: `${rows.length} orders`,
            icon: Wrench,
            tone: "bg-sky-50 text-sky-700",
          },
          {
            label: "Pending",
            value: pendingCount,
            helper: "Awaiting start",
            icon: CircleDashed,
            tone: "bg-amber-50 text-amber-700",
          },
          {
            label: "In Progress",
            value: inProgressCount,
            helper: "Active orders",
            icon: ListChecks,
            tone: "bg-blue-50 text-blue-700",
          },
          {
            label: "Completed",
            value: completedCount,
            helper: "Fulfilled orders",
            icon: CheckCircle2,
            tone: "bg-emerald-50 text-emerald-700",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Surface key={card.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{card.helper}</p>
                </div>
                <span className={`rounded-xl p-2 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </Surface>
          );
        })}
      </section>

      <WorkOrderFilters status={statusFilter} search={searchFilter} />

      <section>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Work Order</th>
                <th className="px-4 py-3">Lead / Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                    {statusFilter || searchFilter
                      ? "No work orders match your filters."
                      : "No work orders yet. They are created automatically when a lead is marked as Won."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="grid gap-1">
                        <Link
                          href={`/work-orders/${row.id}`}
                          className="font-mono text-sm font-semibold text-slate-950 transition hover:text-[#3995d2]"
                        >
                          {row.workOrderNumber}
                        </Link>
                        <span className="text-xs text-slate-500">{row.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-1">
                        <span className="font-medium text-slate-950">
                          {row.clientName || row.leadTitle || "—"}
                        </span>
                        {row.leadCompanyName ? (
                          <span className="text-xs text-slate-500">{row.leadCompanyName}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={workOrderTone(row.status)}>{statusLabel(row.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Money cents={row.totalValueCents} />
                    </td>
                    <td className="px-4 py-3">
                      <DateText value={row.createdAt} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/work-orders/${row.id}`}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-[#3995d2] px-3 text-xs font-semibold text-white transition hover:bg-[#2f80bd]"
                      >
                        Open <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
