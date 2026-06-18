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
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        ) : null}
        <div className="relative">
          <div className="absolute bottom-0 left-0 h-1 w-12 rounded-full bg-gradient-to-r from-primary to-[#60b0e0]" />
          <h1 className="pb-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action ?? (actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/80 hover:shadow-md"
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
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: "green" | "amber" | "red" | "blue" | "purple";
}) {
  const accentBorders = {
    green: "border-l-emerald-500",
    amber: "border-l-amber-500",
    red: "border-l-rose-500",
    blue: "border-l-sky-500",
    purple: "border-l-violet-500",
  };

  return (
    <section
      className={`rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md ${
        accent ? `border-l-4 ${accentBorders[accent]}` : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}
