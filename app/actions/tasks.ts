"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { employees, notifications, taskComments, tasks } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { taskSchema, taskStatusSchema, taskUpdateSchema } from "@/lib/validation/tasks";

const nullable = (value?: string) => (value ? value : null);

async function notifyAssignee(assigneeEmployeeId: string | null, taskId: string, taskTitle: string, actorUserId: string) {
  if (!assigneeEmployeeId) return;
  const [employee] = await getDb()
    .select({ userId: employees.userId })
    .from(employees)
    .where(eq(employees.id, assigneeEmployeeId))
    .limit(1);
  if (!employee?.userId) return;
  await getDb().insert(notifications).values({
    userId: employee.userId,
    type: "task_assigned",
    title: "Task assigned",
    body: `You have been assigned: ${taskTitle}`,
    actorUserId,
  });
}

export async function createTask(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "tasks");

  const parsed = taskSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority"),
    assigneeEmployeeId: formData.get("assigneeEmployeeId") || "",
    clientId: formData.get("clientId") || "",
    dueDate: formData.get("dueDate") || undefined,
  });

  const [task] = await getDb()
    .insert(tasks)
    .values({
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      assigneeEmployeeId: nullable(parsed.assigneeEmployeeId),
      clientId: nullable(parsed.clientId),
      dueDate: parsed.dueDate || null,
      creatorUserId: user.id,
    })
    .returning({ id: tasks.id });

  await logAudit(user.id, "task.created", "task", task.id);
  await notifyAssignee(nullable(parsed.assigneeEmployeeId), task.id, parsed.title, user.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function updateTask(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "tasks");

  const parsed = taskUpdateSchema.parse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority"),
    assigneeEmployeeId: formData.get("assigneeEmployeeId") || "",
    clientId: formData.get("clientId") || "",
    dueDate: formData.get("dueDate") || undefined,
  });

  await getDb()
    .update(tasks)
    .set({
      title: parsed.title,
      description: nullable(parsed.description),
      priority: parsed.priority,
      assigneeEmployeeId: nullable(parsed.assigneeEmployeeId),
      clientId: nullable(parsed.clientId),
      dueDate: parsed.dueDate || null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, parsed.id));

  await logAudit(user.id, "task.updated", "task", parsed.id);
  await notifyAssignee(nullable(parsed.assigneeEmployeeId), parsed.id, parsed.title, user.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function updateTaskStatus(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "tasks");

  const parsed = taskStatusSchema.parse({
    id: formData.get("id"),
    status: formData.get("status"),
  });

  const [task] = await getDb()
    .update(tasks)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(eq(tasks.id, parsed.id))
    .returning({ id: tasks.id, title: tasks.title, assigneeEmployeeId: tasks.assigneeEmployeeId });

  await logAudit(user.id, "task.status_updated", "task", parsed.id, {
    status: parsed.status,
  });
  await notifyAssignee(task.assigneeEmployeeId, task.id, task.title, user.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "tasks");

  const id = String(formData.get("id"));
  if (!id) throw new Error("Task ID is required.");

  await getDb().delete(tasks).where(eq(tasks.id, id));
  await logAudit(user.id, "task.deleted", "task", id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function addTaskComment(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "tasks");

  const taskId = String(formData.get("taskId"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await getDb().insert(taskComments).values({ taskId, body, userId: user.id });
  await logAudit(user.id, "task.commented", "task", taskId);
  revalidatePath("/tasks");
}
