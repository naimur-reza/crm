import "server-only";
import { sql, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  employees, attendanceRecords, tasks, leads, invoices,
  paymentRecords, clients, leaveRequests, expenseClaims,
} from "@/lib/db/schema";
import type { ReportResult } from "./types";

export async function getExecutiveReport(): Promise<ReportResult> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const [
    empCount,
    todayAttendance,
    openTasks,
    overdueTasks,
    totalLeads,
    wonLeads,
    totalBilled,
    totalPaid,
    activeClients,
    pendingLeaves,
    pendingExpenses,
  ] = await Promise.all([
    db.select({ value: sql<number>`count(*)::int` }).from(employees).then((r) => r[0].value),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .where(sql`${attendanceRecords.attendanceDate} = ${today}`)
      .then((r) => r[0].value),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(tasks)
      .where(sql`${tasks.status} != 'done'`)
      .then((r) => r[0].value),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(tasks)
      .where(sql`${tasks.dueDate} < ${today} and ${tasks.status} != 'done'`)
      .then((r) => r[0].value),
    db.select({ value: sql<number>`count(*)::int` }).from(leads).then((r) => r[0].value),
    db.select({ value: sql<number>`count(*)::int` }).from(leads).where(eq(leads.status, "won")).then((r) => r[0].value),
    db
      .select({ value: sql<number>`coalesce(sum(${invoices.totalCents}), 0)::int` })
      .from(invoices)
      .then((r) => r[0].value),
    db
      .select({ value: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int` })
      .from(paymentRecords)
      .then((r) => r[0].value),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(clients)
      .where(sql`${clients.status} = 'active'`)
      .then((r) => r[0].value),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, "pending"))
      .then((r) => r[0].value),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(expenseClaims)
      .where(eq(expenseClaims.status, "pending"))
      .then((r) => r[0].value),
  ]);

  const outstanding = totalBilled - totalPaid;
  const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return {
    title: "Executive Summary",
    description: `Cross-module overview for ${today}.`,
    summaryCards: [
      { label: "Total Employees", value: empCount, tone: "blue" },
      { label: "Today's Attendance", value: todayAttendance, tone: "green" },
      { label: "Open Tasks", value: openTasks, sub: `${overdueTasks} overdue`, tone: overdueTasks > 0 ? "red" : "amber" },
      { label: "Active Clients", value: activeClients, tone: "purple" },
      { label: "Total Leads", value: totalLeads, sub: `${winRate}% win rate`, tone: "blue" },
      { label: "Revenue Billed", value: `$${(totalBilled / 100).toLocaleString()}`, tone: "green" },
      { label: "Outstanding", value: `$${(outstanding / 100).toLocaleString()}`, tone: outstanding > 0 ? "amber" : "green" },
      { label: "Pending Leaves", value: pendingLeaves, tone: pendingLeaves > 0 ? "amber" : "green" },
      { label: "Pending Expenses", value: pendingExpenses, tone: pendingExpenses > 0 ? "amber" : "green" },
    ],
    columns: [
      { key: "metric", label: "Metric" },
      { key: "value", label: "Value" },
    ],
    rows: [
      { metric: "Total Employees", value: String(empCount) },
      { metric: "Today's Attendance", value: String(todayAttendance) },
      { metric: "Open Tasks", value: String(openTasks) },
      { metric: "Overdue Tasks", value: String(overdueTasks) },
      { metric: "Active Clients", value: String(activeClients) },
      { metric: "Total Leads", value: String(totalLeads) },
      { metric: "Win Rate", value: `${winRate}%` },
      { metric: "Revenue Billed", value: `$${(totalBilled / 100).toLocaleString()}` },
      { metric: "Outstanding", value: `$${(outstanding / 100).toLocaleString()}` },
      { metric: "Pending Leave Requests", value: String(pendingLeaves) },
      { metric: "Pending Expense Claims", value: String(pendingExpenses) },
    ],
  };
}
