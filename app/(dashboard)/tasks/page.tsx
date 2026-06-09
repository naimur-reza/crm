import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { addTaskComment, createTask, deleteTask, updateTaskStatus } from "@/app/actions/tasks";
import { AutoStatusSelect } from "./status-select";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { PageHeader } from "@/components/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { clients, employees, tasks } from "@/lib/db/schema";

export default async function TasksPage() {
  const user = await requireUser();
  if (!canAccess(user.roles, "tasks")) redirect("/dashboard");

  const [taskRows, employeeRows, clientRows] = await Promise.all([
    getDb()
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        employeeName: employees.fullName,
        clientName: clients.name,
      })
      .from(tasks)
      .leftJoin(employees, eq(tasks.assigneeEmployeeId, employees.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .orderBy(desc(tasks.createdAt)),
    getDb().select({ id: employees.id, name: employees.fullName }).from(employees),
    getDb().select({ id: clients.id, name: clients.name }).from(clients),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Tasks"
        description="Assign work, track status, and connect tasks to clients."
        action={
          <ModalForm
            title="New task"
            description="Create a task, choose an owner, and optionally connect it to a client."
            triggerLabel="New task"
            action={createTask}
            submitLabel="Create task"
            formClassName="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Field label="Title" name="title" required />
            <Select label="Priority" name="priority" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Select label="Assignee" name="assigneeEmployeeId">
              <option value="">Unassigned</option>
              {employeeRows.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </Select>
            <Select label="Client" name="clientId">
              <option value="">No client</option>
              {clientRows.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
            <Field label="Due date" name="dueDate" type="date" />
            <div className="lg:col-span-3">
              <TextArea label="Description" name="description" />
            </div>
          </ModalForm>
        }
      />
      <DataTable
        headers={["Task", "Assignee", "Client", "Priority", "Due", "Status", "Comment", "Action"]}
        empty="No tasks yet."
        rows={taskRows.map((task) => [
          <div key="task">
            <p className="font-medium text-slate-950">{task.title}</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              {task.description || "No description"}
            </p>
          </div>,
          task.employeeName ?? "-",
          task.clientName ?? "-",
          <span key="priority" className="capitalize">
            {task.priority}
          </span>,
          task.dueDate ?? "-",
          <AutoStatusSelect key={task.id} taskId={task.id} status={task.status} />,
          <ToastActionForm
            key="comment"
            action={addTaskComment}
            successMessage="Comment added."
            resetOnSuccess
            className="flex gap-2"
          >
            <input type="hidden" name="taskId" value={task.id} />
            <input
              name="body"
              placeholder="Add note"
              className="h-9 w-36 rounded-md border border-slate-300 px-2 text-sm"
            />
            <ActionButton variant="secondary">Add</ActionButton>
          </ToastActionForm>,
          <ToastActionForm
            key="delete"
            action={deleteTask}
            successMessage="Task deleted."
          >
            <input type="hidden" name="id" value={task.id} />
            <button
              type="submit"
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Delete
            </button>
          </ToastActionForm>,
        ])}
      />
    </div>
  );
}
