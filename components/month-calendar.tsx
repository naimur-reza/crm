"use client";

import { useMemo } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthCalendar({
  records,
}: {
  records: { attendanceDate: string; status: string }[];
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = now.getDate();

  const statusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) map.set(r.attendanceDate, r.status);
    return map;
  }, [records]);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  function cellColor(day: number | null) {
    if (!day) return "";
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const status = statusMap.get(key);
    if (day === today && !status) return "bg-sky-100 text-sky-800 ring-2 ring-sky-200";
    if (status === "present") return "bg-emerald-100 text-emerald-800 shadow-sm";
    if (status === "late") return "bg-amber-100 text-amber-800 shadow-sm";
    if (status === "absent") return "bg-rose-100 text-rose-800 shadow-sm";
    if (status === "half_day") return "bg-sky-100 text-sky-800 shadow-sm";
    return "text-slate-500 hover:bg-sky-50";
  }

  return (
    <div className="h-full">
      <h3 className="mb-4 border-b border-sky-100 pb-4 text-center text-base font-bold text-sky-800">
        {months[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-2 text-center text-xs">
        {DAYS.map((d) => (
          <div key={d} className="py-1 font-bold text-sky-600">
            {d}
          </div>
        ))}
        {weeks.map((w, i) =>
          w.map((day, j) => (
            <div
              key={`${i}-${j}`}
              className={`flex aspect-square min-h-8 items-center justify-center rounded-lg text-sm font-semibold transition ${cellColor(day)} ${
                day === today ? "font-bold" : ""
              }`}
            >
              {day ?? ""}
            </div>
          )),
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[11px] font-medium text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-200" /> Present
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-200" /> Late
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-200" /> Absent
        </span>
      </div>
    </div>
  );
}
