import "server-only";
import { sql, eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { payrollRuns, payrollPeriods, employees, departments } from "@/lib/db/schema";
import type { ReportResult } from "./types";

export async function getPayrollReport(): Promise<ReportResult> {
  const db = getDb();

  const period = await db
    .select({ id: payrollPeriods.id, periodName: payrollPeriods.periodName, status: payrollPeriods.status })
    .from(payrollPeriods)
    .orderBy(desc(payrollPeriods.startDate))
    .limit(1);

  const periodId = period[0]?.id;

  const conditions = periodId
    ? sql`${payrollRuns.payrollPeriodId} = ${periodId}`
    : sql`1=1`;

  const [summary, byEmployee] = await Promise.all([
    db
      .select({
        totalGross: sql<number>`coalesce(sum(${payrollRuns.grossPayCents}), 0)::int`,
        totalDeductions: sql<number>`coalesce(sum(${payrollRuns.totalDeductionsCents}), 0)::int`,
        totalNet: sql<number>`coalesce(sum(${payrollRuns.netPayCents}), 0)::int`,
        employeeCount: sql<number>`count(distinct ${payrollRuns.employeeId})::int`,
        paidCount: sql<number>`count(*) filter (where ${payrollRuns.status} = 'paid')::int`,
        pendingCount: sql<number>`count(*) filter (where ${payrollRuns.status} = 'pending')::int`,
      })
      .from(payrollRuns)
      .where(conditions),
    db
      .select({
        employeeName: employees.fullName,
        departmentName: departments.name,
        grossPay: sql<number>`coalesce(${payrollRuns.grossPayCents}, 0)::int`,
        deductions: sql<number>`coalesce(${payrollRuns.totalDeductionsCents}, 0)::int`,
        netPay: sql<number>`coalesce(${payrollRuns.netPayCents}, 0)::int`,
        status: payrollRuns.status,
      })
      .from(payrollRuns)
      .innerJoin(employees, eq(payrollRuns.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(conditions)
      .orderBy(employees.fullName),
  ]);

  const s = summary[0] ?? { totalGross: 0, totalDeductions: 0, totalNet: 0, employeeCount: 0, paidCount: 0, pendingCount: 0 };

  return {
    title: `Payroll Summary${period[0] ? ` — ${period[0].periodName}` : ""}`,
    description: "Payroll cost breakdown by employee for the latest period.",
    summaryCards: [
      { label: "Employees", value: s.employeeCount, tone: "blue" },
      { label: "Gross Pay", value: `$${(s.totalGross / 100).toLocaleString()}`, tone: "amber" },
      { label: "Total Deductions", value: `$${(s.totalDeductions / 100).toLocaleString()}`, tone: "red" },
      { label: "Net Pay", value: `$${(s.totalNet / 100).toLocaleString()}`, tone: "green" },
    ],
    columns: [
      { key: "employeeName", label: "Employee" },
      { key: "departmentName", label: "Department" },
      { key: "grossPay", label: "Gross Pay", format: "currency" },
      { key: "deductions", label: "Deductions", format: "currency" },
      { key: "netPay", label: "Net Pay", format: "currency" },
      { key: "status", label: "Status" },
    ],
    rows: byEmployee.map((r) => ({ ...r })),
    chartData: [
      { name: "Gross Pay", value: s.totalGross },
      { name: "Deductions", value: s.totalDeductions },
      { name: "Net Pay", value: s.totalNet },
    ],
    chartType: "bar",
  };
}
