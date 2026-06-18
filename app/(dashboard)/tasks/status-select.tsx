"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { updateTaskStatus } from "@/app/actions/tasks";

export function AutoStatusSelect({
  taskId,
  status,
}: {
  taskId: string;
  status: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleChange() {
    const formData = new FormData(formRef.current!);
    try {
      await updateTaskStatus(formData);
      toast.success("Task status updated.");
      router.refresh();
    } catch (caught) {
      toast.error(formatError(caught));
    }
  }

  return (
    <form ref={formRef}>
      <input type="hidden" name="id" value={taskId} />
      <select
        name="status"
        defaultValue={status}
        onChange={handleChange}
        className="h-9 rounded-md border border-border px-2 text-sm"
      >
        <option value="todo">Todo</option>
        <option value="in_progress">In progress</option>
        <option value="review">Review</option>
        <option value="done">Done</option>
        <option value="blocked">Blocked</option>
      </select>
    </form>
  );
}
