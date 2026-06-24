"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusOptions = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const filterLabels: Record<string, string> = {
  search: "Search",
  status: "Status",
  priority: "Priority",
  assigneeId: "Assignee",
  dueDateFrom: "Due from",
  dueDateTo: "Due to",
};

export function TaskFilters({
  employees,
}: {
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const [open, setOpen] = useState(false);

  const currentStatus = searchParams.get("status") || "";
  const currentPriority = searchParams.get("priority") || "";
  const currentAssignee = searchParams.get("assigneeId") || "";
  const currentDueFrom = searchParams.get("dueDateFrom") || "";
  const currentDueTo = searchParams.get("dueDateTo") || "";

  const filterCount = [currentStatus, currentPriority, currentAssignee, currentDueFrom, currentDueTo].filter(Boolean).length;

  function applyFilters(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const search = searchValue;
    const status = "status" in overrides ? overrides.status : currentStatus;
    const priority = "priority" in overrides ? overrides.priority : currentPriority;
    const assigneeId = "assigneeId" in overrides ? overrides.assigneeId : currentAssignee;
    const dueDateFrom = "dueDateFrom" in overrides ? overrides.dueDateFrom : currentDueFrom;
    const dueDateTo = "dueDateTo" in overrides ? overrides.dueDateTo : currentDueTo;

    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (assigneeId) params.set("assigneeId", assigneeId);
    if (dueDateFrom) params.set("dueDateFrom", dueDateFrom);
    if (dueDateTo) params.set("dueDateTo", dueDateTo);
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleClear() {
    setSearchValue("");
    router.push(pathname);
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters({ search: searchValue });
    }
  }

  function handleFilterChange(field: string, value: string) {
    applyFilters({ [field]: value });
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
              <span className="uppercase tracking-[0.06em]">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  name="search"
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search tasks..."
                  className="h-9 w-56 max-w-full rounded-lg border border-sky-200 bg-white/80 px-8 pr-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Status</span>
              <Select
                value={currentStatus || "all"}
                onValueChange={(v) => handleFilterChange("status", !v || v === "all" ? "" : v)}
              >
                <SelectTrigger size="sm" className="h-9 w-36 border-sky-200 bg-white/80 text-sm font-medium text-slate-700">
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

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Priority</span>
              <Select
                value={currentPriority || "all"}
                onValueChange={(v) => handleFilterChange("priority", !v || v === "all" ? "" : v)}
              >
                <SelectTrigger size="sm" className="h-9 w-36 border-sky-200 bg-white/80 text-sm font-medium text-slate-700">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Assignee</span>
              <Select
                value={currentAssignee || "all"}
                onValueChange={(v) => handleFilterChange("assigneeId", !v || v === "all" ? "" : v)}
              >
                <SelectTrigger size="sm" className="h-9 w-40 border-sky-200 bg-white/80 text-sm font-medium text-slate-700">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Due from</span>
              <input
                type="date"
                name="dueDateFrom"
                defaultValue={currentDueFrom}
                onChange={(e) => handleFilterChange("dueDateFrom", e.target.value)}
                className="h-9 w-36 rounded-lg border border-sky-200 bg-white/80 px-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="grid min-w-0 gap-1.5 text-xs font-semibold text-slate-600">
              <span className="uppercase tracking-[0.06em]">Due to</span>
              <input
                type="date"
                name="dueDateTo"
                defaultValue={currentDueTo}
                onChange={(e) => handleFilterChange("dueDateTo", e.target.value)}
                className="h-9 w-36 rounded-lg border border-sky-200 bg-white/80 px-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <button
              type="button"
              onClick={() => applyFilters({})}
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