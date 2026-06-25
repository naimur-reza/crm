import "server-only";
import { sql, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tasks, employees } from "@/lib/db/schema";
import type { ReportResult } from "./types";

export async function getTaskReport(): Promise<ReportResult> {
  const db = getDb();

  const [statusCounts, byAssignee, overdueCount] = await Promise.all([
    db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .groupBy(tasks.status),
    db
      .select({
        employeeName: employees.fullName,
        todo: sql<number>`count(*) filter (where ${tasks.status} = 'todo')::int`,
        inProgress: sql<number>`count(*) filter (where ${tasks.status} = 'in_progress')::int`,
        review: sql<number>`count(*) filter (where ${tasks.status} = 'review')::int`,
        done: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
        blocked: sql<number>`count(*) filter (where ${tasks.status} = 'blocked')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .innerJoin(employees, eq(tasks.assigneeEmployeeId, employees.id))
      .groupBy(employees.fullName)
      .orderBy(employees.fullName),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        sql`${tasks.dueDate} < CURRENT_DATE and ${tasks.status} != 'done'`,
      )
      .then((r) => r[0].value),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]));
  const totalTasks = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const completed = statusMap["done"] ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  return {
    title: "Task Completion Report",
    description: "Task completion rates by assignee, status, and priority levels.",
    summaryCards: [
      { label: "Total Tasks", value: totalTasks, tone: "blue" },
      { label: "Completed", value: completed, sub: `${completionRate}%`, tone: "green" },
      { label: "Overdue", value: overdueCount, tone: overdueCount > 0 ? "red" : "green" },
      { label: "In Progress", value: statusMap["in_progress"] ?? 0, tone: "amber" },
    ],
    columns: [
      { key: "employeeName", label: "Assignee" },
      { key: "todo", label: "To Do", format: "number" },
      { key: "inProgress", label: "In Progress", format: "number" },
      { key: "review", label: "Review", format: "number" },
      { key: "done", label: "Done", format: "number" },
      { key: "blocked", label: "Blocked", format: "number" },
      { key: "total", label: "Total", format: "number" },
    ],
    rows: byAssignee.map((r) => ({ ...r })),
    chartData: statusCounts.map((r) => ({
      name: r.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: r.count,
    })),
    chartType: "bar",
  };
}
