import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export const userCreateSchema = z.object({
  name: z.string().min(2, "Name is required.").trim(),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["admin", "hr", "manager", "employee", "sales"]),
});

export const userUpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2, "Name is required.").trim(),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  role: z.enum(["admin", "hr", "manager", "employee", "sales"]),
});

export const idSchema = z.object({
  id: z.uuid(),
});

export const permissionGrantSchema = z.object({
  userId: z.uuid(),
  permission: z.string().min(1),
});
