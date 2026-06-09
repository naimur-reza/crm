import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
  Clock3,
  Plus,
  Users,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { attendanceRecords, clients, employees, tasks } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  await requireUser();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [
    employeeStats,
    attendanceStats,
    taskStats,
    clientStats,
    completedTaskStats,
    lateAttendanceStats,
    recentTasks,
    recentClients,
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
        sql`${attendanceRecords.attendanceDate} = ${today} and ${attendanceRecords.status} = 'late'`,
      ),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(5),
    db
      .select({
        id: clients.id,
        name: clients.name,
        status: clients.status,
        source: clients.source,
      })
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .limit(5),
  ]);

  const cards = [
    {
      label: "Employees",
      value: employeeStats[0]?.value ?? 0,
      href: "/employees",
      icon: Users,
      tone: "bg-sky-50 text-sky-700",
      detail: "People in the directory",
    },
    {
      label: "Today attendance",
      value: attendanceStats[0]?.value ?? 0,
      href: "/attendance",
      icon: CalendarCheck,
      tone: "bg-emerald-50 text-emerald-700",
      detail: `${lateAttendanceStats[0]?.value ?? 0} marked late`,
    },
    {
      label: "Open tasks",
      value: taskStats[0]?.value ?? 0,
      href: "/tasks",
      icon: CheckSquare,
      tone: "bg-amber-50 text-amber-700",
      detail: `${completedTaskStats[0]?.value ?? 0} completed total`,
    },
    {
      label: "Active clients",
      value: clientStats[0]?.value ?? 0,
      href: "/clients",
      icon: Building2,
      tone: "bg-rose-50 text-rose-700",
      detail: "Lead and active accounts",
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px] lg:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Command center
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Run employees, clients, attendance, and work from one dashboard.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              A focused operating view for HR, managers, sales, and admins.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Quick create</p>
            <div className="mt-4 grid gap-2">
              {[
                ["Employees", "/employees"],
                ["Tasks", "/tasks"],
                ["Clients", "/crm/clients"],
                ["Users", "/users"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {label}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <span className={`rounded-lg p-2 ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-slate-950">{card.value}</p>
              <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">Recent tasks</h2>
              <p className="text-sm text-slate-500">Latest work items across the company.</p>
            </div>
            <Link href="/tasks" className="text-sm font-medium text-slate-950">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTasks.length ? (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {task.status === "done" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Clock3 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-950">
                      {task.title}
                    </p>
                    <p className="text-xs capitalize text-slate-500">
                      {task.priority} priority · {task.status.replace("_", " ")}
                    </p>
                  </div>
                  <p className="hidden text-xs text-slate-500 sm:block">
                    {task.dueDate ?? "No due date"}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No tasks yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-950">Client pipeline</h2>
            <p className="text-sm text-slate-500">Newest accounts needing attention.</p>
          </div>
          <div className="grid gap-3">
            {recentClients.length ? (
              recentClients.map((client) => (
                <Link
                  key={client.id}
                  href="/clients"
                  className="rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-950">
                      {client.name}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize text-slate-600">
                      {client.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{client.source || "No source"}</p>
                </Link>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No clients yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
