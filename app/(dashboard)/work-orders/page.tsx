import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { ArrowUpRight, CheckCircle2, CircleDashed, CircleOff, ListChecks, Wrench } from "lucide-react";
import { WorkOrderFilters } from "@/components/work-order-filters";
import { Pagination } from "@/components/pagination";
import { Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DateText, Money } from "@/components/ui/format";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { clients, employees, leads, workOrders } from "@/lib/db/schema";

const statusMeta: Record<string, { tone: "green" | "amber" | "red" | "blue" | "purple"; icon: typeof CheckCircle2; accent: "green" | "amber" | "red" | "blue" | "purple" }> = {
  pending: { tone: "amber", icon: CircleDashed, accent: "amber" },
  in_progress: { tone: "blue", icon: ListChecks, accent: "blue" },
  completed: { tone: "green", icon: CheckCircle2, accent: "green" },
  cancelled: { tone: "red", icon: CircleOff, accent: "red" },
};

function statusLabel(status: string) {
  return status.replace("_", " ");
}

export default async function WorkOrdersPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "work_orders")) redirect("/dashboard");

  const sp = await props.searchParams;
  const statusFilter = sp.status || "";
  const searchFilter = sp.search || "";

  const { page, pageSize, offset } = getPaginationParams(sp);

  const conditions = [];
  if (statusFilter) {
    conditions.push(eq(workOrders.status, statusFilter as "pending" | "in_progress" | "completed" | "cancelled"));
  }
  if (searchFilter) {
    conditions.push(
      or(
        like(workOrders.workOrderNumber, `%${searchFilter}%`),
        like(workOrders.title, `%${searchFilter}%`),
        like(leads.title, `%${searchFilter}%`),
        like(clients.name, `%${searchFilter}%`),
      ),
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [stats, rows] = await Promise.all([
    getDb()
      .select({
        totalValueCents: sql<number>`coalesce(sum(${workOrders.totalValueCents}), 0)::int`,
        pendingCount: sql<number>`count(*) filter (where ${workOrders.status} = 'pending')::int`,
        inProgressCount: sql<number>`count(*) filter (where ${workOrders.status} = 'in_progress')::int`,
        completedCount: sql<number>`count(*) filter (where ${workOrders.status} = 'completed')::int`,
        totalCount: sql<number>`count(*)::int`,
      })
      .from(workOrders)
      .leftJoin(leads, eq(workOrders.leadId, leads.id))
      .leftJoin(clients, eq(workOrders.clientId, clients.id))
      .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id))
      .where(whereClause)
      .then((r) => r[0]),
    getDb()
      .select({
        id: workOrders.id,
        workOrderNumber: workOrders.workOrderNumber,
        title: workOrders.title,
        status: workOrders.status,
        totalValueCents: workOrders.totalValueCents,
        createdAt: workOrders.createdAt,
        leadTitle: leads.title,
        leadCompanyName: leads.companyName,
        clientName: clients.name,
        ownerName: employees.fullName,
      })
      .from(workOrders)
      .leftJoin(leads, eq(workOrders.leadId, leads.id))
      .leftJoin(clients, eq(workOrders.clientId, clients.id))
      .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(workOrders.createdAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const totalValueCents = stats.totalValueCents;
  const pendingCount = stats.pendingCount;
  const inProgressCount = stats.inProgressCount;
  const completedCount = stats.completedCount;

  const pagination = buildPagination(page, pageSize, stats.totalCount);

  return (
    <div className="grid gap-6">

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Operations</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Work Orders</h1>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Value",
            value: <Money cents={totalValueCents} />,
            helper: `${stats.totalCount} orders`,
            icon: Wrench,
            tone: "bg-sky-50 text-sky-700 ring-sky-100",
          },
          {
            label: "Pending",
            value: pendingCount,
            helper: "Awaiting start",
            icon: CircleDashed,
            tone: "bg-amber-50 text-amber-700 ring-amber-100",
          },
          {
            label: "In Progress",
            value: inProgressCount,
            helper: "Active orders",
            icon: ListChecks,
            tone: "bg-cyan-50 text-cyan-700 ring-cyan-100",
          },
          {
            label: "Completed",
            value: completedCount,
            helper: "Fulfilled orders",
            icon: CheckCircle2,
            tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="group relative min-h-32 overflow-hidden rounded-xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] transition hover:shadow-[0_18px_48px_rgba(31,92,132,0.16)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
                  <p className="mt-4 text-4xl font-bold leading-none text-slate-800">{card.value}</p>
                  <p className="mt-3 text-xs font-medium text-slate-400">{card.helper}</p>
                </div>
                <span className={`rounded-xl p-2 ring-1 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <WorkOrderFilters status={statusFilter} search={searchFilter} />

      <section>
        <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-1 rounded-full bg-sky-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Records</p>
                <h2 className="mt-0.5 text-base font-black text-slate-800">All Work Orders</h2>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-50/50">
                    <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Work Order</th>
                    <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Lead / Client</th>
                    <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Status</th>
                    <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Value</th>
                    <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Created</th>
                    <th className="sticky top-0 z-10 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Wrench className="h-10 w-10 text-sky-300" />
                          <p className="text-sm text-sky-500">
                            {statusFilter || searchFilter
                              ? "No work orders match your filters."
                              : "No work orders yet. They are created automatically when a lead is marked as Won."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => {
                      const meta = statusMeta[row.status] ?? statusMeta.pending;
                      const StatusIcon = meta.icon;
                      return (
                        <tr
                          key={row.id}
                          className={`align-top transition ${
                            index % 2 === 0 ? "bg-white" : "bg-sky-50/30"
                          } hover:bg-sky-50`}
                        >
                          <td className="px-4 py-3">
                            <div className="grid gap-1">
                              <Link
                                href={`/work-orders/${row.id}`}
                                className="font-mono text-sm font-semibold text-slate-800 transition hover:text-sky-600"
                              >
                                {row.workOrderNumber}
                              </Link>
                              <span className="text-xs text-slate-400">{row.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="grid gap-1">
                              <span className="font-medium text-slate-800">
                                {row.clientName || row.leadTitle || "—"}
                              </span>
                              {row.leadCompanyName ? (
                                <span className="text-xs text-slate-400">{row.leadCompanyName}</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={meta.tone} icon={StatusIcon}>{statusLabel(row.status)}</Badge>
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
                              className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-sky-200 bg-white/80 px-3 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
                            >
                              Open <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} />
          </div>
        </div>
      </section>
    </div>
  );
}
