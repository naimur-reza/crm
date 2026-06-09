import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Client name is required.").trim(),
  status: z.enum(["lead", "active", "paused", "closed"]),
  source: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  ownerEmployeeId: z.uuid().optional().or(z.literal("")),
});

export const contactSchema = z.object({
  clientId: z.uuid(),
  name: z.string().min(2, "Contact name is required.").trim(),
  title: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export const interactionSchema = z.object({
  clientId: z.uuid(),
  type: z.enum(["call", "email", "meeting", "note"]),
  summary: z.string().min(2, "Summary is required.").trim(),
});
