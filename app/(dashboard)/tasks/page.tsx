import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, ilike, lt, ne, or, sql } from "drizzle-orm";
import { createTask, deleteTask } from "@/app/actions/tasks";
import { QuickStatusSelect, QuickPrioritySelect, DueDateBadge } from "./quick-actions";
import { EditTaskForm } from "./edit-form";
import { ClickableTaskTitle } from "./clickable-title";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { Surface } from "@/components/page-header";
import { buildPagination } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { auditLogs, clients, employees, taskComments, tasks, users } from "@/lib/db/schema";
import { TaskFilters } from "./task-filters";
import { ViewToggle } from "./view-toggle";
import { TaskTable } from "./task-table";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { KanbanView } from "./kanban-view";
import { CalendarView } from "./calendar-view";
import {
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Timer,
} from "lucide-react";

function TaskStatCard({
  title,
  value,
  detail,
  icon,
  accent,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  accent: "sky" | "emerald" | "amber" | "rose" | "violet";
}) {
  const accents = {
    sky: { text: "text-sky-700", soft: "bg-sky-50 text-sky-700 ring-sky-100", fillStart: "#7dd3fc", fillEnd: "#eef7fc" },
    emerald: { text: "text-emerald-700", soft: "bg-emerald-50 text-emerald-700 ring-emerald-100", fillStart: "#86efac", fillEnd: "#ecfdf5" },
    amber: { text: "text-amber-700", soft: "bg-amber-50 text-amber-700 ring-amber-100", fillStart: "#fdba74", fillEnd: "#fff7ed" },
    rose: { text: "text-rose-700", soft: "bg-rose-50 text-rose-700 ring-rose-100", fillStart: "#fda4af", fillEnd: "#fff1f2" },
    violet: { text: "text-violet-700", soft: "bg-violet-50 text-violet-700 ring-violet-100", fillStart: "#c4b5fd", fillEnd: "#f5f3ff" },
  };
  const a = accents[accent];

  return (
    <Surface className="group relative min-h-32 overflow-hidden border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] hover:shadow-[0_18px_48px_rgba(31,92,132,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {title}
          </p>
          <p className={`mt-4 text-4xl font-bold leading-none ${a.text}`}>
            {value}
          </p>
          <p className="mt-3 text-xs font-medium text-slate-400">{detail}</p>
        </div>
        <span className={`rounded-xl p-2 ring-1 ${a.soft}`}>{icon}</span>
      </div>
      <svg
        viewBox="0 0 180 80"
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-24 w-40 opacity-90 transition duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id={`task-metric-${accent}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={a.fillStart} stopOpacity="0.78" />
            <stop offset="100%" stopColor={a.fillEnd} stopOpacity="0.92" />
          </linearGradient>
        </defs>
        <path
          d="M0 62 C18 58 21 34 38 35 C52 36 54 56 70 48 C86 40 82 14 101 12 C120 10 120 45 137 40 C153 35 153 22 168 25 C174 27 178 29 180 29 L180 80 L0 80 Z"
          fill={`url(#task-metric-${accent})`}
        />
        <path
          d="M0 62 C18 58 21 34 38 35 C52 36 54 56 70 48 C86 40 82 14 101 12 C120 10 120 45 137 40 C153 35 153 22 168 25 C174 27 178 29 180 29"
          fill="none"
          className={`stroke-${accent === "sky" ? "sky" : accent === "emerald" ? "emerald" : accent === "amber" ? "amber" : accent === "rose" ? "rose" : "violet"}-400`}
          strokeWidth="2"
        />
      </svg>
    </Surface>
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "tasks")) redirect("/dashboard");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 25));
  const offset = (page - 1) * pageSize;
  const view = (params.view === "kanban" || params.view === "calendar") ? params.view : "table";
  const taskId = params.taskId;

  const conditions: ReturnType<typeof and>[] = [];

  if (params.search) {
    conditions.push(
      or(
        ilike(tasks.title, `%${params.search}%`),
        ilike(tasks.description, `%${params.search}%`),
        ilike(employees.fullName, `%${params.search}%`),
      ),
    );
  }

  if (params.status) {
    const statuses = params.status.split(",");
    conditions.push(sql`${tasks.status} IN (${sql.join(statuses.map((s: string) => sql`${s}`), sql`, `)})`);
  }

  if (params.priority) {
    const priorities = params.priority.split(",");
    conditions.push(sql`${tasks.priority} IN (${sql.join(priorities.map((p: string) => sql`${p}`), sql`, `)})`);
  }

  if (params.assigneeId) {
    conditions.push(eq(tasks.assigneeEmployeeId, params.assigneeId));
  }

  if (params.dueDateFrom) {
    conditions.push(sql`${tasks.dueDate} >= ${params.dueDateFrom}`);
  }

  if (params.dueDateTo) {
    conditions.push(sql`${tasks.dueDate} <= ${params.dueDateTo}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortBy = params.sortBy || "createdAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

  const orderMap: Record<string, unknown> = {
    createdAt: sortOrder === "asc" ? asc(tasks.createdAt) : desc(tasks.createdAt),
    title: sortOrder === "asc" ? asc(tasks.title) : desc(tasks.title),
    status: sortOrder === "asc" ? asc(tasks.status) : desc(tasks.status),
    priority: sortOrder === "asc" ? asc(tasks.priority) : desc(tasks.priority),
    dueDate: sortOrder === "asc" ? asc(tasks.dueDate) : desc(tasks.dueDate),
    employeeName: sortOrder === "asc" ? asc(employees.fullName) : desc(employees.fullName),
  };

  const orderBy = orderMap[sortBy] || desc(tasks.createdAt);

  const db = getDb();
  const todayStr = new Date().toISOString().slice(0, 10);

  const queries: Promise<unknown>[] = [
    db.select({ id: employees.id, name: employees.fullName }).from(employees),
    db.select({ id: clients.id, name: clients.name }).from(clients),
  ];

  let countResult: any = { count: 0 };
  let taskRows: any[] = [];
  let kanbanTasks: any[] = [];

  if (view === "table") {
    const countPromise = db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assigneeEmployeeId, employees.id))
      .where(whereClause)
      .then((r) => r[0]);

    const tasksPromise = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        sortOrder: tasks.sortOrder,
        assigneeEmployeeId: tasks.assigneeEmployeeId,
        employeeName: employees.fullName,
        clientId: tasks.clientId,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assigneeEmployeeId, employees.id))
      .where(whereClause)
      .orderBy(orderBy as any)
      .limit(pageSize)
      .offset(offset);

    queries.push(countPromise);
    queries.push(tasksPromise);
  } else {
    const allTasksPromise = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        employeeName: employees.fullName,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assigneeEmployeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(tasks.createdAt));

    queries.push(allTasksPromise);
  }

  let drawerTask: any = null;
  let drawerComments: any[] = [];
  let drawerAuditLogs: any[] = [];

  if (taskId) {
    const taskDetailPromise = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        assigneeEmployeeId: tasks.assigneeEmployeeId,
        employeeName: employees.fullName,
        clientId: tasks.clientId,
        clientName: clients.name,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assigneeEmployeeId, employees.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(eq(tasks.id, taskId))
      .limit(1)
      .then((r) => r[0] || null);

    const commentsPromise = db
      .select({
        id: taskComments.id,
        body: taskComments.body,
        userName: users.name,
        createdAt: taskComments.createdAt,
      })
      .from(taskComments)
      .leftJoin(users, eq(taskComments.userId, users.id))
      .where(eq(taskComments.taskId, taskId))
      .orderBy(desc(taskComments.createdAt));

    const auditPromise = db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        actorName: users.name,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(eq(auditLogs.entityId, taskId as any))
      .orderBy(desc(auditLogs.createdAt));

    queries.push(taskDetailPromise);
    queries.push(commentsPromise);
    queries.push(auditPromise);
  }

  const results = await Promise.all(queries);
  const employeeRows = results[0] as { id: string; name: string }[];
  const clientRows = results[1] as { id: string; name: string }[];

  if (view === "table") {
    countResult = results[2];
    taskRows = results[3] as any[];
  } else {
    kanbanTasks = results[2] as any[];
  }

  if (taskId) {
    const totalResults = results.length;
    drawerTask = results[totalResults - 3];
    drawerComments = results[totalResults - 2] as any[];
    drawerAuditLogs = results[totalResults - 1] as any[];
  }

  // Stats for insight cards
  const [totalCountResult, overdueCount, inProgressCount, doneThisWeekCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(tasks).then((r) => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(
      and(lt(tasks.dueDate, todayStr), ne(tasks.status, "done"), ne(tasks.status, "blocked")),
    ).then((r) => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(eq(tasks.status, "in_progress")).then((r) => r[0]),
    db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(
      and(eq(tasks.status, "done"), gte(tasks.createdAt, sql`now() - interval '7 days'`)),
    ).then((r) => r[0]),
  ]);

  const pagination = buildPagination(page, pageSize, countResult.count);
  const currentSort = { by: sortBy, order: sortOrder as "asc" | "desc" };

  const headers = [
    { label: "Task", key: "title", sortable: true },
    { label: "Assignee", key: "employeeName", sortable: true },
    { label: "Priority", key: "priority", sortable: true },
    { label: "Due", key: "dueDate", sortable: true },
    { label: "Status", key: "status", sortable: true },
    { label: "Action" },
  ];

  return (
    <div className="-m-4 grid gap-6 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.30),transparent_34%),linear-gradient(180deg,#eef7fc_0%,#f8fbfd_46%,#ffffff_100%)] p-4 sm:-m-6 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Overview
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
            Tasks
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle current={view} />
          <ModalForm
            title="Create task"
            description="Assign a new task to an employee."
            triggerLabel="Create task"
            action={createTask}
            triggerVariant="default"
            triggerClassName="h-9 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
          >
            <Field name="title" label="Title" required />
            <Field name="description" label="Description" />
            <Select label="Priority" name="priority" required>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Select label="Assignee" name="assigneeEmployeeId">
              <option value="">Unassigned</option>
              {employeeRows.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </Select>
            <Field name="dueDate" label="Due date" type="date" defaultValue={params.dueDateFrom || ""} />
          </ModalForm>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TaskStatCard
          title="Total Tasks"
          value={String(totalCountResult.count)}
          detail="All tasks in the system"
          icon={<ListTodo className="h-4 w-4" />}
          accent="sky"
        />
        <TaskStatCard
          title="Overdue"
          value={String(overdueCount.count)}
          detail="Past due date, not done"
          icon={<AlertCircle className="h-4 w-4" />}
          accent="rose"
        />
        <TaskStatCard
          title="In Progress"
          value={String(inProgressCount.count)}
          detail="Currently being worked on"
          icon={<Timer className="h-4 w-4" />}
          accent="amber"
        />
        <TaskStatCard
          title="Completed (7d)"
          value={String(doneThisWeekCount.count)}
          detail="Done in the last 7 days"
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="emerald"
        />
      </div>

      {/* Filter Section */}
      <TaskFilters employees={employeeRows} />

      {/* Main Content */}
      <Surface className="overflow-hidden border-sky-100 bg-white/95 p-0 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-1 rounded-full bg-sky-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                  {view === "table" ? "List" : view === "kanban" ? "Board" : "Calendar"}
                </p>
                <h2 className="mt-0.5 text-base font-black text-slate-800">
                  {view === "table"
                    ? `Tasks (${totalCountResult.count})`
                    : view === "kanban"
                      ? "Drag & drop to update status"
                      : "View tasks by due date"}
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className={view === "table" ? "p-5" : "p-5"}>
          {view === "table" ? (
            <TaskTable
              headers={headers}
              currentSort={currentSort}
              employees={employeeRows}
              empty="No tasks match your filters."
              rows={taskRows.map((task) => [
                <ClickableTaskTitle key="title" taskId={task.id}>
                  <div>
                    <p className="font-bold text-slate-800">{task.title}</p>
                    <p className="mt-0.5 max-w-xs truncate text-xs font-medium text-slate-400">
                      {task.description || "No description"}
                    </p>
                  </div>
                </ClickableTaskTitle>,
                <span key="assignee" className="text-sm">
                  {task.employeeName ? (
                    <Badge tone="blue">
                      {task.employeeName}
                    </Badge>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">—</span>
                  )}
                </span>,
                <QuickPrioritySelect key="priority" taskId={task.id} priority={task.priority} />,
                <DueDateBadge key="due" dueDate={task.dueDate} />,
                <QuickStatusSelect key="status" taskId={task.id} status={task.status} />,
                <div key="actions" className="flex items-center gap-1">
                  <EditTaskForm
                    task={{
                      id: task.id,
                      title: task.title,
                      description: task.description,
                      priority: task.priority,
                      assigneeEmployeeId: task.assigneeEmployeeId,
                      dueDate: task.dueDate,
                    }}
                    employeeRows={employeeRows}
                  />
                  <ToastActionForm
                    action={deleteTask}
                    successMessage="Task deleted."
                  >
                    <input type="hidden" name="id" value={task.id} />
                    <Button type="submit" variant="destructive" size="xs">Delete</Button>
                  </ToastActionForm>
                </div>,
                task.id,
              ])}
            >
              <div className="mt-4">
                <Pagination {...pagination} />
              </div>
            </TaskTable>
          ) : view === "kanban" ? (
            <KanbanView tasks={kanbanTasks} />
          ) : (
            <CalendarView tasks={kanbanTasks} />
          )}
        </div>
      </Surface>

      <TaskDetailDrawer
        task={drawerTask}
        comments={drawerComments}
        auditLogs={drawerAuditLogs}
        employees={employeeRows}
      />
    </div>
  );
}
