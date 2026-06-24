"use client";

import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const priorityColors: Record<string, string> = {
  low: "#94a3b8",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

const statusDots: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  done: "#22c55e",
  blocked: "#ef4444",
};

type CalendarTask = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  priority: string;
  employeeName: string | null;
};

export function CalendarView({ tasks }: { tasks: CalendarTask[] }) {
  const calendarRef = useRef<FullCalendar>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const events = tasks
    .filter((t) => !!t.dueDate)
    .map((task) => ({
      id: task.id,
      title: task.title,
      start: task.dueDate ?? undefined,
      allDay: true as const,
      backgroundColor: priorityColors[task.priority] || "#94a3b8",
      borderColor: "transparent" as const,
      textColor: "#fff" as const,
      extendedProps: { status: task.status, employeeName: task.employeeName },
    }));

  function handleEventClick(info: { event: { id: string } }) {
    const params = new URLSearchParams(searchParams);
    params.set("taskId", info.event.id);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleDateSelect(info: { startStr: string; endStr: string }) {
    const params = new URLSearchParams(searchParams);
    params.set("dueDateFrom", info.startStr);
    params.set("dueDateTo", info.endStr);
    params.set("view", "table");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventClick={handleEventClick}
        selectable={true}
        select={handleDateSelect}
        height="auto"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek,dayGridDay",
        }}
        buttonText={{
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
        }}
        eventDisplay="block"
        eventMaxStack={3}
        dayMaxEvents={2}
        noEventsText="No tasks due"
        contentHeight="auto"
      />
      <style>{`
        .fc { --fc-border-color: var(--border); --fc-page-bg: transparent; --fc-today-bg: oklch(0.9 0.05 240 / 0.3); --fc-now-indicator-color: var(--primary); }
        .fc .fc-toolbar-title { font-size: 1rem; font-weight: 600; }
        .fc .fc-button { background: transparent; border-color: var(--border); color: var(--foreground); font-size: 0.8rem; }
        .fc .fc-button-primary:not(:disabled).fc-button-active { background: var(--primary); border-color: var(--primary); color: var(--primary-foreground); }
        .fc .fc-button-primary:hover { background: var(--muted); }
        .fc .fc-daygrid-day-number { font-size: 0.8rem; color: var(--muted-foreground); padding: 4px 6px; }
        .fc .fc-daygrid-day-frame { min-height: 80px; }
        .fc .fc-daygrid-event { border-radius: 4px; padding: 1px 4px; font-size: 0.7rem; cursor: pointer; margin-bottom: 1px; }
        .fc .fc-daygrid-more-link { font-size: 0.7rem; }
        .fc .fc-day-today .fc-daygrid-day-number { background: var(--primary); color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin: 2px; }
        .fc .fc-col-header-cell { padding: 6px 0; }
        .fc .fc-col-header-cell-cushion { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--muted-foreground); letter-spacing: 0.05em; }
        .fc .fc-day-other .fc-daygrid-day-number { opacity: 0.3; }
      `}</style>
    </div>
  );
}
