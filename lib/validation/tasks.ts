import { z } from "zod";

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
