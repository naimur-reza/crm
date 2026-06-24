"use client";

import { useRouter, usePathname } from "next/navigation";
import { Filter, X } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const statusOptions = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half day" },
];

export function ReportFilters({
  year,
  month,
  from,
  to,
  employeeId,
  departmentId,
  status,
  employees,
  departments,
}: {
  year: number;
  month: number;
  from: string;
  to: string;
  employeeId: string;
  departmentId: string;
  status: string;
  employees: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const hasDateRange = !!(from && to);
  const filterCount = [employeeId, departmentId, status].filter(Boolean).length;

  function buildParams(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const f = "from" in overrides ? overrides.from : from;
    const t = "to" in overrides ? overrides.to : to;
    const m = "month" in overrides ? overrides.month : String(month);
    const y = "year" in overrides ? overrides.year : String(year);
    const emp = "employeeId" in overrides ? overrides.employeeId : employeeId;
    const dept = "departmentId" in overrides ? overrides.departmentId : departmentId;
    const st = "status" in overrides ? overrides.status : status;

    if (f && t) {
      params.set("from", f);
      params.set("to", t);
    } else {
      params.set("month", m);
      params.set("year", y);
    }
    if (emp) params.set("employeeId", emp);
    if (dept) params.set("departmentId", dept);
    if (st) params.set("status", st);
    return params.toString();
  }

  function handleFilterChange(field: string, value: string) {
    router.push(`${pathname}?${buildParams({ [field]: value })}`);
  }

  function handleClear() {
    router.push(pathname);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-xs font-bold uppercase tracking-[0.08em] shadow-sm transition ${
          open || filterCount > 0
            ? "border-sky-300 bg-sky-50 text-sky-700"
            : "border-sky-200 bg-white/80 text-slate-500 hover:border-sky-300 hover:text-sky-600"
        }`}
      >
        <Filter className="h-3.5 w-3.5" />
        {open ? "Hide filters" : "Filters"}
        {filterCount > 0 ? (
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white">
            {filterCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="rounded-xl border border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">From</span>
              <input
                type="date"
                name="from"
                defaultValue={from}
                onChange={(e) => handleFilterChange("from", e.target.value)}
                className="h-9 w-36 rounded-lg border border-sky-200 bg-white/80 px-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">To</span>
              <input
                type="date"
                name="to"
                defaultValue={to}
                onChange={(e) => handleFilterChange("to", e.target.value)}
                className="h-9 w-36 rounded-lg border border-sky-200 bg-white/80 px-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <span className="text-xs font-semibold text-slate-400">— or —</span>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Year</span>
              <Select
                value={hasDateRange ? "all" : String(year)}
                onValueChange={(v) => handleFilterChange("year", v === "all" ? String(currentYear) : v ?? "")}
              >
                <SelectTrigger size="sm" className="h-9 w-24 border-sky-200 bg-white/80 text-sm font-medium text-slate-700">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Month</span>
              <Select
                value={hasDateRange ? "all" : String(month)}
                onValueChange={(v) => handleFilterChange("month", v ?? "")}
              >
                <SelectTrigger size="sm" className="h-9 w-32 border-sky-200 bg-white/80 text-sm font-medium text-slate-700">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Employee</span>
              <Select
                value={employeeId || "all"}
                onValueChange={(v) => handleFilterChange("employeeId", !v || v === "all" ? "" : v)}
              >
                <SelectTrigger size="sm" className="h-9 w-40 border-sky-200 bg-white/80 text-sm font-medium text-slate-700">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Department</span>
              <Select
                value={departmentId || "all"}
                onValueChange={(v) => handleFilterChange("departmentId", !v || v === "all" ? "" : v)}
              >
                <SelectTrigger size="sm" className="h-9 w-40 border-sky-200 bg-white/80 text-sm font-medium text-slate-700">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Status</span>
              <Select
                value={status || "all"}
                onValueChange={(v) => handleFilterChange("status", !v || v === "all" ? "" : v)}
              >
                <SelectTrigger size="sm" className="h-9 w-32 border-sky-200 bg-white/80 text-sm font-medium text-slate-700">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={() => router.push(`${pathname}?${buildParams({})}`)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
            >
              <Filter className="h-3.5 w-3.5" />
              Apply
            </button>

            {filterCount > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-200 bg-white/80 px-4 text-sm font-bold text-slate-500 shadow-sm transition hover:border-sky-400 hover:text-sky-700"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
