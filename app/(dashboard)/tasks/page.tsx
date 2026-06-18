import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { createTask, deleteTask, updateTaskStatus } from "@/app/actions/tasks";
import { AutoStatusSelect } from "./status-select";
import { EditTaskForm } from "./edit-form";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { employees, tasks } from "@/lib/db/schema";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "tasks")) redirect("/dashboard");

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, taskRows, employeeRows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assigneeEmployeeId, employees.id))
      .then((r) => r[0]),
    getDb()
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        assigneeEmployeeId: tasks.assigneeEmployeeId,
        employeeName: employees.fullName,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assigneeEmployeeId, employees.id))
      .orderBy(desc(tasks.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb().select({ id: employees.id, name: employees.fullName }).from(employees),
  ]);

  const pagination = buildPagination(page, pageSize, count);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
        <ModalForm
          title="Create task"
          description="Assign a new task to an employee."
          triggerLabel="Create task"
          action={createTask}
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
          <Field name="dueDate" label="Due date" type="date" />
        </ModalForm>
      </div>

      <DataTable
        headers={["Task", "Assignee", "Due", "Status", "Action"]}
        empty="No tasks yet."
        rows={taskRows.map((task) => [
          <div key="task">
            <p className="font-medium text-foreground">{task.title}</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              {task.description || "No description"}
            </p>
          </div>,
          task.employeeName ?? "-",
          task.dueDate ?? "-",
          <AutoStatusSelect key={task.id} taskId={task.id} status={task.status} />,
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
        ])}
      />
      <Pagination {...pagination} />
    </div>
  );
}
