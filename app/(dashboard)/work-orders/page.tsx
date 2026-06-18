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
  if (!canAccess(user.roles, "work_orders")) redirect("/dashboard");

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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Value",
            value: <Money cents={totalValueCents} />,
            helper: `${stats.totalCount} orders`,
            icon: Wrench,
            tone: "bg-sky-50 text-sky-700",
          },
          {
            label: "Pending",
            value: pendingCount,
            helper: "Awaiting start",
            ...statusMeta.pending,
          },
          {
            label: "In Progress",
            value: inProgressCount,
            helper: "Active orders",
            ...statusMeta.in_progress,
          },
          {
            label: "Completed",
            value: completedCount,
            helper: "Fulfilled orders",
            ...statusMeta.completed,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Surface key={card.label} className="p-5" accent={"accent" in card ? (card as typeof card & { accent: string }).accent as "green" | "amber" | "red" | "blue" | "purple" | undefined : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{card.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{card.helper}</p>
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
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-muted to-card">
                <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Work Order</th>
                <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lead / Client</th>
                <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Value</th>
                <th className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</th>
                <th className="sticky top-0 z-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Wrench className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
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
                        index % 2 === 0 ? "bg-card" : "bg-muted/50"
                      } hover:bg-blue-50/40`}
                    >
                      <td className="px-4 py-3">
                        <div className="grid gap-1">
                          <Link
                            href={`/work-orders/${row.id}`}
                            className="font-mono text-sm font-semibold text-foreground transition hover:text-primary"
                          >
                            {row.workOrderNumber}
                          </Link>
                          <span className="text-xs text-muted-foreground">{row.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid gap-1">
                          <span className="font-medium text-foreground">
                            {row.clientName || row.leadTitle || "—"}
                          </span>
                          {row.leadCompanyName ? (
                            <span className="text-xs text-muted-foreground">{row.leadCompanyName}</span>
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
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/80"
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
      </section>
    </div>
  );
}
