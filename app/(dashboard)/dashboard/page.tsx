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
      tone: "bg-sky-50 text-sky-700 ring-sky-100",
    },
    {
      label: "Today",
      value: todayAttendance[0]?.value ?? 0,
      href: "/attendance",
      icon: CalendarCheck,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      sub: `${lateToday[0]?.value ?? 0} late`,
    },
    {
      label: "Open Tasks",
      value: openTasks[0]?.value ?? 0,
      href: "/tasks",
      icon: CheckSquare,
      tone: "bg-amber-50 text-amber-700 ring-amber-100",
      sub: `${completedTasks[0]?.value ?? 0} done`,
    },
    {
      label: "Active Clients",
      value: activeClients[0]?.value ?? 0,
      href: "/crm/clients",
      icon: Building2,
      tone: "bg-rose-50 text-rose-700 ring-rose-100",
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
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Overview</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm font-medium text-slate-400">Company overview at a glance.</p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative min-h-32 overflow-hidden rounded-xl border border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(31,92,132,0.16)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{card.label}</p>
                  <p className="mt-4 text-4xl font-bold leading-none text-slate-800">{card.value}</p>
                  {card.sub && <p className="mt-3 text-xs font-medium text-slate-400">{card.sub}</p>}
                </div>
                <span className={`rounded-xl p-2 ring-1 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
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
        <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-800">Recent Tasks</h2>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-sm font-bold text-sky-600"
            >
              View all <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentTasks.length ? (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${task.status === "done" ? "bg-emerald-400" : task.status === "blocked" ? "bg-rose-400" : task.status === "in_progress" ? "bg-amber-400" : "bg-slate-300"}`}
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                    {task.title}
                  </p>
                  <span className="shrink-0 text-xs capitalize text-slate-400">
                    {task.priority}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm font-medium text-slate-400">
                No tasks yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-800">Recent Clients</h2>
            <Link
              href="/crm/clients"
              className="flex items-center gap-1 text-sm font-bold text-sky-600"
            >
              View all <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-2">
            {recentClients.length ? (
              recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between rounded-xl border border-sky-100 px-3 py-2.5"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {client.name}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs capitalize ${client.status === "active" ? "bg-emerald-50 text-emerald-700" : client.status === "lead" ? "bg-sky-50 text-sky-700" : "bg-slate-50 text-slate-500"}`}
                  >
                    {client.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm font-medium text-slate-400">
                No clients yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
