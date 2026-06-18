"use client";

import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function ReportFilters({
  year,
  month,
  employeeId,
  status,
  employees,
}: {
  year: number;
  month: number;
  employeeId: string;
  status: string;
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    const params = new URLSearchParams();
    params.set("month", formData.get("month") as string);
    params.set("year", formData.get("year") as string);
    const emp = formData.get("employeeId") as string;
    if (emp) params.set("employeeId", emp);
    const st = formData.get("status") as string;
    if (st) params.set("status", st);
    router.push(`/attendance/reports?${params.toString()}`);
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
        <span>Year</span>
        <select
          name="year"
          defaultValue={year}
          className="h-11 w-28 rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
        <span>Month</span>
        <select
          name="month"
          defaultValue={month}
          className="h-11 w-36 rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i + 1} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
        <span>Employee</span>
        <select
          name="employeeId"
          defaultValue={employeeId}
          className="h-11 w-48 rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="">All employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
        <span>Status</span>
        <select
          name="status"
          defaultValue={status}
          className="h-11 w-32 rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="">All</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="half_day">Half day</option>
        </select>
      </div>

      <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80">
        <Filter className="h-4 w-4" />
        Apply
      </button>
    </form>
  );
}
