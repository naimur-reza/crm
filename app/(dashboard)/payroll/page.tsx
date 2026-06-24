import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { employees, payrollPeriods, payrollRuns } from "@/lib/db/schema";

export default async function PayrollDashboardPage() {
  const user = await requireUser();
  if (!canAccess(user, "payroll")) redirect("/dashboard");

  const [activeCountResult, pendingRunsResult, completedPeriods] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(eq(employees.status, "active"))
      .then((r) => r[0]),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(payrollRuns)
      .where(eq(payrollRuns.status, "pending"))
      .then((r) => r[0]),
    getDb()
      .select({
        id: payrollPeriods.id,
        periodName: payrollPeriods.periodName,
        startDate: payrollPeriods.startDate,
        endDate: payrollPeriods.endDate,
        status: payrollPeriods.status,
        processedAt: payrollPeriods.processedAt,
        createdAt: payrollPeriods.createdAt,
      })
      .from(payrollPeriods)
      .orderBy(desc(payrollPeriods.createdAt))
      .limit(10),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">HRM</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Payroll Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Active Employees</p>
          <p className="mt-2 text-3xl font-black text-slate-800">{activeCountResult.count}</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Pending Payroll Runs</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{pendingRunsResult.count}</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Total Periods</p>
          <p className="mt-2 text-3xl font-black text-slate-800">{completedPeriods.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/payroll/salary-structures"
          className="rounded-lg border border-sky-200 bg-white/80 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
        >
          Salary Structures
        </Link>
        <Link
          href="/payroll/deductions"
          className="rounded-lg border border-sky-200 bg-white/80 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
        >
          Deductions
        </Link>
        <Link
          href="/payroll/employee-deductions"
          className="rounded-lg border border-sky-200 bg-white/80 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
        >
          Employee Deductions
        </Link>
        <Link
          href="/payroll/bank-details"
          className="rounded-lg border border-sky-200 bg-white/80 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
        >
          Bank Details
        </Link>
        <Link
          href="/payroll/runs"
          className="rounded-lg border border-sky-200 bg-white/80 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
        >
          Payroll Runs
        </Link>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">History</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Recent Payroll Periods</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          {completedPeriods.length === 0 ? (
            <p className="text-sm text-slate-500">No payroll periods yet. Create one in Payroll Runs.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {completedPeriods.map((p) => (
                <Link
                  key={p.id}
                  href={`/payroll/runs/${p.id}`}
                  className="flex items-center justify-between py-3 transition hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.periodName}</p>
                    <p className="text-xs text-slate-500">{p.startDate} → {p.endDate}</p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    {p.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
