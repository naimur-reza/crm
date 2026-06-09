import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

export function PageHeader({
  title,
  description,
  actionHref,
  actionLabel,
  backHref,
  action,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#3995d2]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
      </div>
      {action ?? (actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3995d2] px-4 text-sm font-semibold text-white transition hover:bg-[#2f80bd]"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Link>
      ) : null)}
    </div>
  );
}

export function Surface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}
