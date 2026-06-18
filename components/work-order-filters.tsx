"use client";

import { useRouter } from "next/navigation";
import { Filter, Search } from "lucide-react";

export function WorkOrderFilters({
  status,
  search,
}: {
  status: string;
  search: string;
}) {
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    const params = new URLSearchParams();
    const st = formData.get("status") as string;
    if (st) params.set("status", st);
    const sq = formData.get("search") as string;
    if (sq) params.set("search", sq);
    router.push(`/work-orders?${params.toString()}`);
  }

  function handleClear() {
    router.push("/work-orders");
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
        <span>Search</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Number, title, lead, client..."
            className="h-11 w-64 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
        <span>Status</span>
        <select
          name="status"
          defaultValue={status}
          className="h-11 w-36 rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80">
        <Filter className="h-4 w-4" />
        Apply
      </button>

      {(status || search) ? (
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
