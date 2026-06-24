"use client";

import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserCheck, Flag, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { bulkAction } from "@/app/actions/tasks";
import { formatError } from "@/lib/format-error";

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

export function BulkActions({
  selectedIds,
  employees,
  onClear,
}: {
  selectedIds: string[];
  employees: { id: string; name: string }[];
  onClear: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (selectedIds.length === 0) return null;

  async function handleAction(formData: FormData) {
    formData.set("taskIds", JSON.stringify(selectedIds));
    setPending(true);
    try {
      await bulkAction(formData);
      toast.success(`Updated ${selectedIds.length} task(s).`);
      onClear();
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-2.5 text-sm shadow-sm">
      <span className="text-xs font-bold uppercase tracking-[0.06em] text-sky-700">
        {selectedIds.length} selected
      </span>

      <form ref={formRef} action={handleAction} className="flex items-center gap-2">
        <select
          name="value"
          className="h-8 rounded-lg border border-sky-200 bg-white/80 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-sky-400"
          defaultValue=""
        >
          <option value="" disabled>
            Change status...
          </option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          name="action"
          value="status"
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-sky-600 px-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
          title="Set status"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
          Status
        </button>

        <select
          name="value"
          className="h-8 rounded-lg border border-sky-200 bg-white/80 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-sky-400"
          defaultValue=""
        >
          <option value="" disabled>
            Change priority...
          </option>
          {priorityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          name="action"
          value="priority"
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-sky-600 px-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
          title="Set priority"
        >
          <Flag className="h-3 w-3" />
          Priority
        </button>

        <select
          name="value"
          className="h-8 rounded-lg border border-sky-200 bg-white/80 px-2 text-xs font-semibold text-slate-700 outline-none focus:border-sky-400"
          defaultValue=""
        >
          <option value="" disabled>
            Assign to...
          </option>
          <option value="">Unassign</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          name="action"
          value="assign"
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-sky-600 px-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
          title="Assign"
        >
          <UserCheck className="h-3 w-3" />
          Assign
        </button>

        <button
          type="submit"
          name="action"
          value="delete"
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
          onClick={(e) => {
            if (!confirm(`Delete ${selectedIds.length} task(s)?`)) {
              e.preventDefault();
            }
          }}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </form>

      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs font-bold text-slate-400 underline-offset-2 hover:text-sky-700 hover:underline"
      >
        Clear
      </button>
    </div>
  );
}
