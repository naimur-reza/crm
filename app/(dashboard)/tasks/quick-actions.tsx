"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { updateTaskPriority, updateTaskStatus } from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  blocked: "Blocked",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const statusTone: Record<string, "slate" | "blue" | "amber" | "green" | "red"> = {
  todo: "slate",
  in_progress: "blue",
  review: "amber",
  done: "green",
  blocked: "red",
};

const priorityTone: Record<string, "slate" | "blue" | "amber" | "red"> = {
  low: "slate",
  medium: "blue",
  high: "amber",
  urgent: "red",
};

export function QuickStatusSelect({ taskId, status }: { taskId: string; status: string }) {
  const router = useRouter();

  async function handleValueChange(newStatus: string | null) {
    if (!newStatus || newStatus === status) return;
    const formData = new FormData();
    formData.set("id", taskId);
    formData.set("status", newStatus);
    try {
      await updateTaskStatus(formData);
      toast.success(`Status changed to ${statusLabels[newStatus]}`);
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
    }
  }

  return (
    <Select value={status} onValueChange={handleValueChange}>
      <SelectTrigger size="sm" className="gap-0.5 border-0 bg-transparent p-0 ring-0 focus-visible:ring-0">
        <Badge tone={statusTone[status]}>{statusLabels[status]}</Badge>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusLabels).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function QuickPrioritySelect({ taskId, priority }: { taskId: string; priority: string }) {
  const router = useRouter();

  async function handleValueChange(newPriority: string | null) {
    if (!newPriority || newPriority === priority) return;
    const formData = new FormData();
    formData.set("id", taskId);
    formData.set("priority", newPriority);
    try {
      await updateTaskPriority(formData);
      toast.success(`Priority changed to ${priorityLabels[newPriority]}`);
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
    }
  }

  return (
    <Select value={priority} onValueChange={handleValueChange}>
      <SelectTrigger size="sm" className="gap-0.5 border-0 bg-transparent p-0 ring-0 focus-visible:ring-0">
        <Badge tone={priorityTone[priority]}>{priorityLabels[priority]}</Badge>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(priorityLabels).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DueDateBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let tone: "red" | "amber" | "blue" | "slate" = "slate";
  let label = dueDate;

  if (diff < 0) {
    tone = "red";
    label = `${Math.abs(diff)}d overdue`;
  } else if (diff === 0) {
    tone = "amber";
    label = "Due today";
  } else if (diff === 1) {
    tone = "amber";
    label = "Due tomorrow";
  } else if (diff <= 7) {
    tone = "blue";
    label = `Due in ${diff}d`;
  }

  return (
    <Badge tone={tone} title={dueDate}>
      {label}
    </Badge>
  );
}
