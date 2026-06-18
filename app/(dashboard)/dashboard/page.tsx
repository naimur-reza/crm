import Link from "next/link";
import { desc, eq, sql, and, gte } from "drizzle-orm";
import {
  Users,
  CalendarCheck,
  CheckSquare,
  Building2,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { attendanceRecords, clients, employees, tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { DashboardCharts } from "./charts";

export default async function DashboardPage() {
  await requireUser();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    employeeCount,
    todayAttendance,
    openTasks,
    activeClients,
    completedTasks,
    lateToday,
    recentTasks,
    recentClients,
    taskStatusCounts,
    weeklyAttendance,
    clientStatusCounts,
  ] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(employees),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .where(sql`${attendanceRecords.attendanceDate} = ${today}`),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(tasks)
      .where(sql`${tasks.status} != 'done'`),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(clients)
      .where(sql`${clients.status} in ('lead', 'active')`),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.status, "done")),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .where(
        and(
          sql`${attendanceRecords.attendanceDate} = ${today}`,
          eq(attendanceRecords.status, "late"),
        ),
      ),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
      })
      .from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(5),
    db
      .select({ id: clients.id, name: clients.name, status: clients.status })
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .limit(5),
    db
      .select({ status: tasks.status, count: sql<number>`count(*)::int` })
      .from(tasks)
      .groupBy(tasks.status),
    db
      .select({
        date: attendanceRecords.attendanceDate,
        count: sql<number>`count(*)::int`,
      })
      .from(attendanceRecords)
      .where(
        gte(
          attendanceRecords.attendanceDate,
          sevenDaysAgo.toISOString().slice(0, 10),
        ),
      )
      .groupBy(attendanceRecords.attendanceDate)
      .orderBy(attendanceRecords.attendanceDate),
    db
      .select({ status: clients.status, count: sql<number>`count(*)::int` })
      .from(clients)
      .groupBy(clients.status),
  ]);

  const stats = [
    {
      label: "Employees",
      value: employeeCount[0]?.value ?? 0,
      href: "/employees",
      icon: Users,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Today",
      value: todayAttendance[0]?.value ?? 0,
      href: "/attendance",
      icon: CalendarCheck,
      tone: "bg-emerald-50 text-emerald-700",
      sub: `${lateToday[0]?.value ?? 0} late`,
    },
    {
      label: "Open Tasks",
      value: openTasks[0]?.value ?? 0,
      href: "/tasks",
      icon: CheckSquare,
      tone: "bg-amber-50 text-amber-700",
      sub: `${completedTasks[0]?.value ?? 0} done`,
    },
    {
      label: "Active Clients",
      value: activeClients[0]?.value ?? 0,
      href: "/crm/clients",
      icon: Building2,
      tone: "bg-rose-50 text-rose-700",
    },
  ];

  const taskStatusData = taskStatusCounts.map((r) => ({
    name: r.status.replace("_", " "),
    value: r.count,
  }));
  const weeklyData = weeklyAttendance.map((r) => ({
    date: r.date.slice(5),
    count: r.count,
  }));
  const clientStatusData = clientStatusCounts.map((r) => ({
    name: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    value: r.count,
  }));

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Company overview at a glance.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </p>
                <span className={`rounded-lg p-2 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {card.value}
              </p>
              {card.sub && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {card.sub}
                </p>
              )}
            </Link>
          );
        })}
      </section>

      <DashboardCharts
        taskStatusData={taskStatusData}
        weeklyData={weeklyData}
        clientStatusData={clientStatusData}
      />

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent Tasks</h2>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-sm font-medium text-primary"
            >
              View all <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentTasks.length ? (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${task.status === "done" ? "bg-emerald-500" : task.status === "blocked" ? "bg-rose-500" : task.status === "in_progress" ? "bg-amber-500" : "bg-muted-foreground/40"}`}
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {task.priority}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No tasks yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent Clients</h2>
            <Link
              href="/crm/clients"
              className="flex items-center gap-1 text-sm font-medium text-primary"
            >
              View all <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-2">
            {recentClients.length ? (
              recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {client.name}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs capitalize ${client.status === "active" ? "bg-emerald-50 text-emerald-700" : client.status === "lead" ? "bg-sky-50 text-sky-700" : "bg-muted text-muted-foreground"}`}
                  >
                    {client.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No clients yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
