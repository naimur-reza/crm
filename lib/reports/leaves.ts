import "server-only";
import { sql, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leaveRequests, employees } from "@/lib/db/schema";
import type { ReportResult } from "./types";

export async function getLeaveReport(): Promise<ReportResult> {
  const db = getDb();

  const currentYear = new Date().getFullYear();

  const [byType, byEmployee, pendingCount] = await Promise.all([
    db
      .select({
        leaveType: leaveRequests.leaveType,
        count: sql<number>`count(*)::int`,
        totalDays: sql<number>`coalesce(sum(${leaveRequests.endDate}::date - ${leaveRequests.startDate}::date + 1), 0)::int`,
      })
      .from(leaveRequests)
      .groupBy(leaveRequests.leaveType),
    db
      .select({
        employeeName: employees.fullName,
        sickDays: sql<number>`coalesce(sum(case when ${leaveRequests.leaveType} = 'sick' then ${leaveRequests.endDate}::date - ${leaveRequests.startDate}::date + 1 else 0 end), 0)::int`,
        casualDays: sql<number>`coalesce(sum(case when ${leaveRequests.leaveType} = 'casual' then ${leaveRequests.endDate}::date - ${leaveRequests.startDate}::date + 1 else 0 end), 0)::int`,
        annualDays: sql<number>`coalesce(sum(case when ${leaveRequests.leaveType} = 'annual' then ${leaveRequests.endDate}::date - ${leaveRequests.startDate}::date + 1 else 0 end), 0)::int`,
        unpaidDays: sql<number>`coalesce(sum(case when ${leaveRequests.leaveType} = 'unpaid' then ${leaveRequests.endDate}::date - ${leaveRequests.startDate}::date + 1 else 0 end), 0)::int`,
        totalDays: sql<number>`coalesce(sum(${leaveRequests.endDate}::date - ${leaveRequests.startDate}::date + 1), 0)::int`,
        approvedDays: sql<number>`coalesce(sum(case when ${leaveRequests.status} = 'approved' then ${leaveRequests.endDate}::date - ${leaveRequests.startDate}::date + 1 else 0 end), 0)::int`,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .groupBy(employees.fullName)
      .orderBy(employees.fullName),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, "pending"))
      .then((r) => r[0].value),
  ]);

  const totalDays = byType.reduce((sum, r) => sum + r.totalDays, 0);
  const totalApproved = byEmployee.reduce((sum, r) => sum + r.approvedDays, 0);

  return {
    title: "Leave Utilization Report",
    description: `Leave balance usage by type and employee for ${currentYear}.`,
    summaryCards: [
      { label: "Total Leave Days", value: totalDays, tone: "blue" },
      { label: "Approved Days", value: totalApproved, tone: "green" },
      { label: "Pending Requests", value: pendingCount, tone: pendingCount > 0 ? "amber" : "green" },
    ],
    columns: [
      { key: "employeeName", label: "Employee" },
      { key: "sickDays", label: "Sick", format: "number" },
      { key: "casualDays", label: "Casual", format: "number" },
      { key: "annualDays", label: "Annual", format: "number" },
      { key: "unpaidDays", label: "Unpaid", format: "number" },
      { key: "totalDays", label: "Total", format: "number" },
      { key: "approvedDays", label: "Approved", format: "number" },
    ],
    rows: byEmployee.map((r) => ({ ...r })),
    chartData: byType.map((r) => ({
      name: r.leaveType.charAt(0).toUpperCase() + r.leaveType.slice(1),
      value: r.totalDays,
    })),
    chartType: "pie",
  };
}
