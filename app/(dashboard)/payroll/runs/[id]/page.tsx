import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import {
  payrollPeriods,
  payrollRuns,
  payslips,
  employees,
} from "@/lib/db/schema";
import {
  runPayrollCalculation,
  confirmPayrollRun,
  updatePayrollRunStatus,
  generatePayslips,
} from "@/app/actions/payroll";

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "payroll_runs")) redirect("/dashboard");

  const { id } = await params;

  const [period] = await getDb()
    .select()
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, id))
    .limit(1);

  if (!period) return <p className="text-slate-500">Payroll period not found.</p>;

  const runs = await getDb()
    .select({
      id: payrollRuns.id,
      employeeId: payrollRuns.employeeId,
      employeeName: employees.fullName,
      grossPayCents: payrollRuns.grossPayCents,
      totalDeductionsCents: payrollRuns.totalDeductionsCents,
      netPayCents: payrollRuns.netPayCents,
      status: payrollRuns.status,
      paidAt: payrollRuns.paidAt,
      paymentMethod: payrollRuns.paymentMethod,
      attendanceSummary: payrollRuns.attendanceSummary,
      payslipId: payslips.id,
    })
    .from(payrollRuns)
    .leftJoin(employees, eq(payrollRuns.employeeId, employees.id))
    .leftJoin(payslips, eq(payslips.payrollRunId, payrollRuns.id))
    .where(eq(payrollRuns.payrollPeriodId, id))
    .orderBy(employees.fullName);

  const totalGross = runs.reduce((s, r) => s + r.grossPayCents, 0);
  const totalDeductions = runs.reduce((s, r) => s + r.totalDeductionsCents, 0);
  const totalNet = runs.reduce((s, r) => s + r.netPayCents, 0);
  const paidCount = runs.filter((r) => r.status === "paid").length;

  function cents(c: number) {
    return (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Payroll</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">{period.periodName}</h1>
          <p className="text-sm text-slate-500">
            {period.startDate} → {period.endDate}
            {period.paymentDate ? ` · Pay by ${period.paymentDate}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              period.status === "completed"
                ? "bg-green-100 text-green-700"
                : period.status === "draft"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {period.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {period.status === "draft" && (
          <>
            <form action={runPayrollCalculation}>
              <input type="hidden" name="periodId" value={id} />
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                Run Payroll Calculation
              </button>
            </form>
            {runs.length > 0 && (
              <form action={confirmPayrollRun}>
                <input type="hidden" name="periodId" value={id} />
                <button
                  type="submit"
                  className="rounded-lg bg-green-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-700"
                >
                  Confirm & Complete
                </button>
              </form>
            )}
          </>
        )}
        {period.status === "completed" && (
          <form action={generatePayslips}>
            <input type="hidden" name="periodId" value={id} />
            <button
              type="submit"
              className="rounded-lg border border-sky-200 bg-white/80 px-5 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
            >
              Generate Payslips
            </button>
          </form>
        )}
        {period.status === "completed" && (
          <Link
            href={`/api/payroll/runs/${id}/export/bank-csv`}
            className="rounded-lg border border-sky-200 bg-white/80 px-5 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          >
            Export Bank CSV
          </Link>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Employees</p>
          <p className="mt-2 text-3xl font-black text-slate-800">{runs.length}</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Gross Pay</p>
          <p className="mt-2 text-3xl font-black text-slate-800">${cents(totalGross)}</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Total Deductions</p>
          <p className="mt-2 text-3xl font-black text-red-600">${cents(totalDeductions)}</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Net Pay</p>
          <p className="mt-2 text-3xl font-black text-green-600">${cents(totalNet)}</p>
        </div>
      </div>

      {/* Employee table */}
      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Breakdown</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">
                Employee Breakdown ({paidCount}/{runs.length} paid)
              </h2>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net Pay</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payslip</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    No payroll runs yet. Click &quot;Run Payroll Calculation&quot; to start.
                  </td>
                </tr>
              )}
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{run.employeeName}</td>
                  <td className="px-4 py-3">${cents(run.grossPayCents)}</td>
                  <td className="px-4 py-3 text-red-600">${cents(run.totalDeductionsCents)}</td>
                  <td className="px-4 py-3 font-bold text-green-700">${cents(run.netPayCents)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        run.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : run.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {run.payslipId ? (
                      <Link
                        href={`/api/payroll/runs/${id}/payslip/${run.employeeId}/pdf`}
                        className="text-xs font-semibold text-sky-600 hover:underline"
                      >
                        View PDF
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {run.status === "pending" && period.status === "completed" && (
                      <form action={updatePayrollRunStatus}>
                        <input type="hidden" name="id" value={run.id} />
                        <input type="hidden" name="status" value="paid" />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-green-600 hover:underline"
                        >
                          Mark Paid
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {runs.length > 0 && (
              <tfoot>
                <tr className="bg-sky-50 font-bold text-slate-800">
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3">${cents(totalGross)}</td>
                  <td className="px-4 py-3 text-red-600">${cents(totalDeductions)}</td>
                  <td className="px-4 py-3 text-green-700">${cents(totalNet)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
