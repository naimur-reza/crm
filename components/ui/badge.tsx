import type { ComponentType } from "react";

export function Badge({
  children,
  tone = "slate",
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "blue" | "purple";
  icon?: ComponentType<{ className?: string }>;
  title?: string;
}) {
  const tones = {
    slate: "bg-muted text-muted-foreground ring-border",
    green: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800",
    amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800",
    red: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-800",
    blue: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 ring-sky-200 dark:ring-sky-800",
    purple: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-violet-200 dark:ring-violet-800",
  };

  return (
    <span title={title} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone]}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}
