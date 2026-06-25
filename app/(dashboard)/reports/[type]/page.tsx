import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { REPORT_METAS, type ReportType } from "@/lib/reports";
import { generateReport } from "@/lib/reports";
import { ReportClient } from "./report-client";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default async function ReportTypePage(props: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "reports")) redirect("/dashboard");

  const { type } = await props.params;
  const sp = await props.searchParams;

  const meta = REPORT_METAS.find((m) => m.type === type);
  if (!meta || !meta.roles.some((r) => user.roles.includes(r))) {
    redirect("/reports");
  }

  const year = sp.year ? parseInt(sp.year) : currentYear;
  const month = sp.month ? parseInt(sp.month) : currentMonth;
  const from = sp.from || "";
  const to = sp.to || "";
  const employeeId = sp.employeeId || "";
  const departmentId = sp.departmentId || "";

  const result = await generateReport({
    type: type as ReportType,
    year,
    month,
    from,
    to,
    employeeId,
    departmentId,
  });

  return (
    <div className="-m-4 grid gap-6 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.30),transparent_34%),linear-gradient(180deg,#eef7fc_0%,#f8fbfd_46%,#ffffff_100%)] p-4 sm:-m-6 sm:p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/reports"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 bg-white/80 text-slate-500 shadow-sm transition hover:border-sky-300 hover:text-sky-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Reports
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
            {meta.label}
          </h1>
        </div>
      </div>

      <ReportClient
        type={type as ReportType}
        result={result}
        year={year}
        month={month}
        from={from}
        to={to}
        employeeId={employeeId}
        departmentId={departmentId}
      />
    </div>
  );
}
