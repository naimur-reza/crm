import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Field } from "@/components/ui/field";
import { createPayrollPeriod } from "@/app/actions/payroll";
import { Pagination } from "@/components/pagination";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { requireUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { payrollPeriods, payrollRuns } from "@/lib/db/schema";
import { getLocalYear, getLocalMonth } from "@/lib/time";

export default async function PayrollRunsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "payroll_runs")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, periods] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(payrollPeriods)
      .then((r) => r[0]),
    getDb()
      .select({
        id: payrollPeriods.id,
        periodName: payrollPeriods.periodName,
        startDate: payrollPeriods.startDate,
        endDate: payrollPeriods.endDate,
        paymentDate: payrollPeriods.paymentDate,
        status: payrollPeriods.status,
        processedAt: payrollPeriods.processedAt,
        createdAt: payrollPeriods.createdAt,
        employeeCount: sql<number>`(select count(*)::int from ${payrollRuns} where ${payrollRuns.payrollPeriodId} = ${payrollPeriods.id})`,
        paidCount: sql<number>`(select count(*)::int from ${payrollRuns} where ${payrollRuns.payrollPeriodId} = ${payrollPeriods.id} and ${payrollRuns.status} = 'paid')`,
        totalNetCents: sql<number>`coalesce((select sum(${payrollRuns.netPayCents})::int from ${payrollRuns} where ${payrollRuns.payrollPeriodId} = ${payrollPeriods.id}), 0)`,
      })
      .from(payrollPeriods)
      .orderBy(desc(payrollPeriods.createdAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  const now = new Date();
  const defaultName = `${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;
  const year = getLocalYear();
  const month = String(getLocalMonth()).padStart(2, "0");
  const lastDay = new Date(year, getLocalMonth(), 0).getDate();
  const defaultStart = `${year}-${month}-01`;
  const defaultEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

  function cents(c: number) {
    return (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Payroll</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Payroll Runs</h1>
        </div>
        <ModalForm
          title="Create payroll period"
          description="Start a new payroll run for a month."
          triggerLabel="New payroll period"
          triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          action={createPayrollPeriod}
        >
          <Field name="periodName" label="Period name" defaultValue={defaultName} required />
          <Field name="startDate" label="Start date" type="date" defaultValue={defaultStart} required />
          <Field name="endDate" label="End date" type="date" defaultValue={defaultEnd} required />
          <Field name="paymentDate" label="Payment date" type="date" />
        </ModalForm>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-1 rounded-full bg-sky-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Periods</p>
              <h2 className="mt-0.5 text-base font-black text-slate-800">Payroll Periods</h2>
            </div>
          </div>
        </div>
        <div className="p-5">
          <DataTable
            headers={["Period", "Date Range", "Employees", "Paid", "Total", "Status"]}
            empty="No payroll periods yet."
            rows={periods.map((p) => [
              <Link key="name" href={`/payroll/runs/${p.id}`} className="font-semibold text-sky-700 hover:underline">
                {p.periodName}
              </Link>,
              `${p.startDate} → ${p.endDate}`,
              String(p.employeeCount),
              `${p.paidCount} / ${p.employeeCount}`,
              `$${cents(p.totalNetCents)}`,
              <span
                key="status"
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  p.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : p.status === "draft"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {p.status}
              </span>,
            ])}
          />
          <Pagination {...pagination} />
        </div>
      </div>
    </div>
  );
}
