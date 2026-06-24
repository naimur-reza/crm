"use client";

import { LayoutGrid, List, CalendarDays } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const views = [
  { id: "table", label: "Table", icon: List },
  { id: "kanban", label: "Kanban", icon: LayoutGrid },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
] as const;

export type TaskView = (typeof views)[number]["id"];

export function ViewToggle({ current }: { current: TaskView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(view: TaskView) {
    const params = new URLSearchParams(searchParams);
    params.set("view", view);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-sky-200 bg-white/80 p-0.5 shadow-sm">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = current === view.id;
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => handleChange(view.id)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
              isActive
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-500 hover:text-sky-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
