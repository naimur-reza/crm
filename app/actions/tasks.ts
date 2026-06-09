"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { taskComments, tasks } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { taskSchema, taskStatusSchema } from "@/lib/validation/tasks";

const nullable = (value?: string) => (value ? value : null);

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

  await getDb()
    .update(tasks)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(eq(tasks.id, parsed.id));

  await logAudit(user.id, "task.status_updated", "task", parsed.id, {
    status: parsed.status,
  });
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
