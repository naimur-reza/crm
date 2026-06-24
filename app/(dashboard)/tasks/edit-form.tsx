"use client";

import { updateTask } from "@/app/actions/tasks";
import { EditModal } from "@/components/edit-modal";
import { Field, Select } from "@/components/ui/field";

type EmployeeOption = { id: string; name: string };

export function EditTaskForm({
  task,
  employeeRows,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    assigneeEmployeeId: string | null;
    dueDate: string | null;
  };
  employeeRows: EmployeeOption[];
}) {
  return (
    <EditModal
      title="Edit task"
      description="Update task details."
      action={updateTask}
      submitLabel="Update task"
    >
      <input type="hidden" name="id" value={task.id} />
      <Field name="title" label="Title" defaultValue={task.title} required />
      <Field name="description" label="Description" defaultValue={task.description ?? ""} />
      <Select label="Priority" name="priority" defaultValue={task.priority}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </Select>
      <Select label="Assignee" name="assigneeEmployeeId" defaultValue={task.assigneeEmployeeId ?? ""}>
        <option value="">Unassigned</option>
        {employeeRows.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.name}
          </option>
        ))}
      </Select>
      <Field name="dueDate" label="Due date" type="date" defaultValue={task.dueDate ?? ""} />
    </EditModal>
  );
}
