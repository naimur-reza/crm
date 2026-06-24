"use server";

import { and, desc, eq, ilike, inArray, or, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { clients, employees, notifications, taskComments, tasks } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { buildPagination } from "@/lib/pagination";
import {
  bulkActionSchema,
  taskPrioritySchema,
  taskSchema,
  taskStatusSchema,
  taskUpdateSchema,
} from "@/lib/validation/tasks";

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
  requirePermission(user, "tasks");

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
  requirePermission(user, "tasks");

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
  requirePermission(user, "tasks");

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

export async function updateTaskPriority(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "tasks");

  const parsed = taskPrioritySchema.parse({
    id: formData.get("id"),
    priority: formData.get("priority"),
  });

  await getDb()
    .update(tasks)
    .set({ priority: parsed.priority, updatedAt: new Date() })
    .where(eq(tasks.id, parsed.id));

  await logAudit(user.id, "task.priority_updated", "task", parsed.id, {
    priority: parsed.priority,
  });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "tasks");

  const id = String(formData.get("id"));
  if (!id) throw new Error("Task ID is required.");

  await getDb().delete(tasks).where(eq(tasks.id, id));
  await logAudit(user.id, "task.deleted", "task", id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function addTaskComment(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "tasks");

  const taskId = String(formData.get("taskId"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await getDb().insert(taskComments).values({ taskId, body, userId: user.id });
  await logAudit(user.id, "task.commented", "task", taskId);
  revalidatePath("/tasks");
}

export async function getFilteredTasks(searchParams: Record<string, string>) {
  const user = await requireUser();
  requirePermission(user, "tasks");

  const db = getDb();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  const filters: (typeof searchParams)[] = [];

  const conditions: ReturnType<typeof and>[] = [];

  if (searchParams.search) {
    conditions.push(
      or(
        ilike(tasks.title, `%${searchParams.search}%`),
        ilike(tasks.description, `%${searchParams.search}%`),
        ilike(employees.fullName, `%${searchParams.search}%`),
      ),
    );
  }

  if (searchParams.status) {
    const statuses = searchParams.status.split(",");
    conditions.push(sql`${tasks.status} IN (${sql.join(statuses.map(s => sql`${s}`), sql`, `)})`);
  }

  if (searchParams.priority) {
    const priorities = searchParams.priority.split(",");
    conditions.push(sql`${tasks.priority} IN (${sql.join(priorities.map(p => sql`${p}`), sql`, `)})`);
  }

  if (searchParams.assigneeId) {
    conditions.push(eq(tasks.assigneeEmployeeId, searchParams.assigneeId));
  }

  if (searchParams.clientId) {
    conditions.push(eq(tasks.clientId, searchParams.clientId));
  }

  if (searchParams.dueDateFrom) {
    conditions.push(sql`${tasks.dueDate} >= ${searchParams.dueDateFrom}`);
  }

  if (searchParams.dueDateTo) {
    conditions.push(sql`${tasks.dueDate} <= ${searchParams.dueDateTo}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortBy = searchParams.sortBy || "createdAt";
  const sortOrder = searchParams.sortOrder === "asc" ? "asc" : "desc";

  const orderMap: Record<string, unknown> = {
    createdAt: sortOrder === "asc" ? asc(tasks.createdAt) : desc(tasks.createdAt),
    title: sortOrder === "asc" ? asc(tasks.title) : desc(tasks.title),
    status: sortOrder === "asc" ? asc(tasks.status) : desc(tasks.status),
    priority: sortOrder === "asc" ? asc(tasks.priority) : desc(tasks.priority),
    dueDate: sortOrder === "asc" ? asc(tasks.dueDate) : desc(tasks.dueDate),
    employeeName: sortOrder === "asc" ? asc(employees.fullName) : desc(employees.fullName),
  };

  const orderBy = orderMap[sortBy] || desc(tasks.createdAt);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .leftJoin(employees, eq(tasks.assigneeEmployeeId, employees.id))
    .where(whereClause);

  const taskRows = await db
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

  return {
    tasks: taskRows,
    pagination: buildPagination(page, pageSize, count),
    employees: await db.select({ id: employees.id, name: employees.fullName }).from(employees),
    clients: await db.select({ id: clients.id, name: clients.name }).from(clients),
  };
}

export async function bulkAction(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "tasks");

  const parsed = bulkActionSchema.parse({
    taskIds: JSON.parse(String(formData.get("taskIds") || "[]")),
    action: formData.get("action"),
    value: formData.get("value"),
  });

  switch (parsed.action) {
    case "status": {
      await getDb()
        .update(tasks)
        .set({ status: parsed.value as any, updatedAt: new Date() })
        .where(inArray(tasks.id, parsed.taskIds));
      await logAudit(user.id, "task.bulk_status_updated", "task", parsed.taskIds[0], {
        count: parsed.taskIds.length,
        status: parsed.value,
      });
      break;
    }
    case "priority": {
      await getDb()
        .update(tasks)
        .set({ priority: parsed.value as any, updatedAt: new Date() })
        .where(inArray(tasks.id, parsed.taskIds));
      await logAudit(user.id, "task.bulk_priority_updated", "task", parsed.taskIds[0], {
        count: parsed.taskIds.length,
        priority: parsed.value,
      });
      break;
    }
    case "assign": {
      await getDb()
        .update(tasks)
        .set({ assigneeEmployeeId: nullable(parsed.value), updatedAt: new Date() })
        .where(inArray(tasks.id, parsed.taskIds));
      await logAudit(user.id, "task.bulk_assigned", "task", parsed.taskIds[0], {
        count: parsed.taskIds.length,
      });
      break;
    }
    case "delete": {
      await getDb().delete(tasks).where(inArray(tasks.id, parsed.taskIds));
      await logAudit(user.id, "task.bulk_deleted", "task", parsed.taskIds[0], {
        count: parsed.taskIds.length,
      });
      break;
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function reorderTask(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "tasks");

  const id = String(formData.get("id"));
  const sortOrder = Number(formData.get("sortOrder"));

  await getDb()
    .update(tasks)
    .set({ sortOrder, updatedAt: new Date() })
    .where(eq(tasks.id, id));

  await logAudit(user.id, "task.reordered", "task", id, { sortOrder });
  revalidatePath("/tasks");
}
