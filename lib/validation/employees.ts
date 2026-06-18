import { z } from "zod";

export const employeeSchema = z.object({
  fullName: z.string().min(2, "Employee name is required.").trim(),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  phone: z.string().optional(),
  designation: z.string().min(2, "Designation is required.").trim(),
  joiningDate: z.string().optional(),
  userId: z.uuid().optional().or(z.literal("")),
});

export const employeeUpdateSchema = z.object({
  id: z.uuid(),
  fullName: z.string().min(2, "Employee name is required.").trim(),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  phone: z.string().optional(),
  designation: z.string().min(2, "Designation is required.").trim(),
  joiningDate: z.string().optional(),
  userId: z.uuid().optional().or(z.literal("")),
});

export const employeeIdSchema = z.object({
  id: z.uuid(),
});
