import type { ComponentType } from "react";

export function Badge({
  children,
  tone = "slate",
  icon: Icon,
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "blue" | "purple";
  icon?: ComponentType<{ className?: string }>;
}) {
  const tones = {
    slate: "bg-muted text-muted-foreground ring-border",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    blue: "bg-sky-50 text-sky-700 ring-sky-200",
    purple: "bg-violet-50 text-violet-700 ring-violet-200",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone]}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}
