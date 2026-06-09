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
