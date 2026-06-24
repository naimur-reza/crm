import { z } from "zod/v4";

export const taskSchema = z.object({
  title: z.string().min(2, "Task title is required.").trim(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigneeEmployeeId: z.uuid().optional().or(z.literal("")),
  clientId: z.uuid().optional().or(z.literal("")),
  dueDate: z.string().optional(),
});

export const taskUpdateSchema = z.object({
  id: z.uuid(),
  title: z.string().min(2, "Task title is required.").trim(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigneeEmployeeId: z.uuid().optional().or(z.literal("")),
  clientId: z.uuid().optional().or(z.literal("")),
  dueDate: z.string().optional(),
});

export const taskStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["todo", "in_progress", "review", "done", "blocked"]),
});

export const taskPrioritySchema = z.object({
  id: z.uuid(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

export const taskFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional(),
  clientId: z.string().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const bulkActionSchema = z.object({
  taskIds: z.array(z.uuid()).min(1, "Select at least one task."),
  action: z.enum(["status", "assign", "delete", "priority"]),
  value: z.string(),
});
