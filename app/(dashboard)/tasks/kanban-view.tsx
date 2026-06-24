"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { updateTaskStatus } from "@/app/actions/tasks";
import { formatError } from "@/lib/format-error";

const statusConfig = {
  todo: { label: "Todo", color: "border-t-sky-400" },
  in_progress: { label: "In Progress", color: "border-t-blue-400" },
  review: { label: "Review", color: "border-t-amber-400" },
  done: { label: "Done", color: "border-t-emerald-400" },
  blocked: { label: "Blocked", color: "border-t-rose-400" },
} as const;

const priorityColors: Record<string, string> = {
  low: "bg-slate-300",
  medium: "bg-sky-400",
  high: "bg-amber-400",
  urgent: "bg-rose-400",
};

type KanbanTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  employeeName: string | null;
};

function KanbanCard({ task }: { task: KanbanTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`cursor-grab rounded-xl border border-sky-100 bg-white p-3 shadow-[0_4px_12px_rgba(31,92,132,0.06)] transition hover:shadow-[0_8px_24px_rgba(31,92,132,0.10)] active:cursor-grabbing ${
        isDragging ? "z-50 opacity-70 shadow-lg ring-2 ring-sky-400" : ""
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${priorityColors[task.priority] || "bg-slate-300"}`} />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{task.priority}</span>
        {task.dueDate ? (
          <span className="ml-auto text-xs font-medium text-slate-400">{task.dueDate}</span>
        ) : null}
      </div>
      <p className="text-sm font-bold text-slate-800 leading-snug">{task.title}</p>
      {task.employeeName ? (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
            {task.employeeName.charAt(0).toUpperCase()}
          </span>
          <span className="text-xs font-semibold text-slate-500">{task.employeeName}</span>
        </div>
      ) : null}
    </div>
  );
}

function ColumnHeader({ status, count }: { status: string; count: number }) {
  const cfg = statusConfig[status as keyof typeof statusConfig];
  return (
    <div className={`rounded-t-xl border-t-4 ${cfg?.color || "border-t-slate-300"} bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_100%)] px-4 py-3`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-[0.06em]">{cfg?.label || status}</h3>
        <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-sky-100 px-1.5 text-xs font-bold text-sky-700">
          {count}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onAddClick,
}: {
  status: string;
  tasks: KanbanTask[];
  onAddClick: (status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });

  return (
    <div
      className={`flex w-72 shrink-0 flex-col rounded-xl border border-sky-100 bg-white/60 shadow-[0_8px_24px_rgba(31,92,132,0.06)] transition ${
        isOver ? "ring-2 ring-sky-400/50 bg-sky-50/80" : ""
      }`}
    >
      <ColumnHeader status={status} count={tasks.length} />
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 overflow-y-auto p-3"
        style={{ maxHeight: "calc(100vh - 340px)" }}
      >
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-xs font-semibold text-slate-400">
            <p>No tasks</p>
          </div>
        ) : (
          tasks.map((task) => <KanbanCard key={task.id} task={task} />)
        )}
        <button
          type="button"
          onClick={() => onAddClick(status)}
          className="mt-1 flex items-center gap-1.5 rounded-xl border border-dashed border-sky-200 bg-white/50 px-3 py-2.5 text-xs font-bold text-slate-400 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      </div>
    </div>
  );
}

export function KanbanView({
  tasks,
}: {
  tasks: KanbanTask[];
}) {
  const router = useRouter();
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as KanbanTask;
    if (task) setActiveTask(task);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const task = active.data.current?.task as KanbanTask;

      let targetStatus: string | null = null;
      const overId = over.id as string;

      if (overId.startsWith("column-")) {
        targetStatus = overId.replace("column-", "");
      } else {
        const overTask = over.data.current?.task as KanbanTask | undefined;
        if (overTask) targetStatus = overTask.status;
      }

      if (!targetStatus || targetStatus === task.status) return;

      const formData = new FormData();
      formData.set("id", taskId);
      formData.set("status", targetStatus);
      try {
        await updateTaskStatus(formData);
        toast.success(`Moved to ${targetStatus.replace("_", " ")}`);
        router.refresh();
      } catch (caught) {
        toast.error(formatError(caught));
      }
    },
    [router],
  );

  const columns = Object.keys(statusConfig);
  const tasksByStatus: Record<string, KanbanTask[]> = {};
  for (const col of columns) {
    tasksByStatus[col] = tasks.filter((t) => t.status === col);
  }

  function handleAddClick(status: string) {
    router.push(`/tasks?` + new URLSearchParams({ status }).toString());
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {columns.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status] || []}
            onAddClick={handleAddClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72 rounded-xl border border-sky-200 bg-white p-3 shadow-2xl opacity-90">
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${priorityColors[activeTask.priority] || "bg-slate-300"}`} />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {activeTask.priority}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-800">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
