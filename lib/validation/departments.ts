import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(2, "Department name is required.").trim(),
  description: z.string().optional(),
});

export const departmentUpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2, "Department name is required.").trim(),
  description: z.string().optional(),
});

export const departmentIdSchema = z.object({
  id: z.uuid(),
});
