import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  TrendingUp,
  BadgeDollarSign,
  Receipt,
  CreditCard,
  CheckSquare,
  CalendarDays,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { REPORT_METAS, type ReportMeta } from "@/lib/reports";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CalendarCheck,
  TrendingUp,
  BadgeDollarSign,
  Receipt,
  CreditCard,
  CheckSquare,
  CalendarDays,
  BarChart3,
};

function ReportCard({ meta }: { meta: ReportMeta }) {
  const Icon = iconMap[meta.icon] ?? BarChart3;
  return (
    <Link
      href={`/reports/${meta.type}`}
      className="group relative overflow-hidden rounded-xl border border-sky-100 bg-white/90 p-6 shadow-[0_14px_40px_rgba(31,92,132,0.10)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(31,92,132,0.16)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
            Report
          </p>
          <h3 className="mt-2 text-base font-black text-slate-800">
            {meta.label}
          </h3>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            {meta.description}
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-sky-50 p-3 text-sky-700 ring-1 ring-sky-100 transition group-hover:bg-sky-100">
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <div className="mt-4 flex items-center gap-1 text-sm font-bold text-sky-600 group-hover:gap-2 transition-all">
        View Report <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

export default async function ReportsPage() {
  const user = await requireUser();
  if (!canAccess(user, "reports")) redirect("/dashboard");

  const accessible = REPORT_METAS.filter((m) =>
    m.roles.some((r) => user.roles.includes(r)),
  );

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
          Analytics
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
          Reports & Analytics
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-400">
          Generate detailed reports across all business areas.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {accessible.map((meta) => (
          <ReportCard key={meta.type} meta={meta} />
        ))}
      </div>
    </div>
  );
}
