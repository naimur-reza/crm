import { z } from "zod";

export const leadSchema = z.object({
  title: z.string().min(2, "Lead title is required.").trim(),
  companyName: z.string().optional(),
  source: z.string().optional(),
  value: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  ownerEmployeeId: z.uuid().optional().or(z.literal("")),
  stageId: z.uuid().optional().or(z.literal("")),
  contactName: z.string().optional(),
  contactEmail: z.email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const leadStageSchema = z.object({
  leadId: z.uuid(),
  stageId: z.uuid(),
});

export const leadNotesSchema = z.object({
  leadId: z.uuid(),
  notes: z.string().max(5000, "Notes are too long.").optional(),
});

export const leadProfileSchema = z.object({
  leadId: z.uuid(),
  title: z.string().min(2, "Lead title is required.").trim(),
  companyName: z.string().optional(),
  source: z.string().optional(),
  value: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  ownerEmployeeId: z.uuid().optional().or(z.literal("")),
});

export const leadActivitySchema = z.object({
  leadId: z.uuid(),
  type: z.enum(["call", "email", "meeting", "note", "whatsapp", "follow_up"]),
  summary: z.string().min(2, "Summary is required.").trim(),
  dueAt: z.string().optional(),
});

export const invoiceSchema = z.object({
  leadId: z.uuid().optional().or(z.literal("")),
  clientId: z.uuid().optional().or(z.literal("")),
  workOrderId: z.uuid().optional().or(z.literal("")),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  itemDescription: z.string().min(2, "Invoice item is required.").trim(),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.string().min(1, "Unit price is required."),
  discount: z.string().optional(),
  tax: z.string().optional(),
  notes: z.string().optional(),
});

export const invoiceUpdateSchema = z.object({
  invoiceId: z.uuid(),
  status: z.enum(["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"]),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  discount: z.string().optional(),
  tax: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  invoiceId: z.uuid(),
  amount: z.string().min(1, "Amount is required."),
  paymentDate: z.string().min(1),
  method: z.string().min(2, "Payment method is required.").trim(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const notificationTemplateSchema = z.object({
  key: z.string().min(2).trim(),
  name: z.string().min(2).trim(),
  body: z.string().min(5).trim(),
});

export const whatsappLogSchema = z.object({
  templateId: z.uuid(),
  leadId: z.uuid().optional().or(z.literal("")),
  clientId: z.uuid().optional().or(z.literal("")),
  invoiceId: z.uuid().optional().or(z.literal("")),
  recipientName: z.string().optional(),
  recipientPhone: z.string().min(5, "WhatsApp number is required."),
});

export const invoiceEmailSchema = z.object({
  invoiceId: z.uuid(),
  recipientName: z.string().optional(),
  recipientEmail: z.email("A valid email address is required."),
  message: z.string().max(2000, "Message is too long.").optional(),
});

export const invoiceWhatsAppSchema = z.object({
  invoiceId: z.uuid(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().min(5, "WhatsApp number is required."),
  message: z.string().max(1600, "Message is too long.").optional(),
});

export const leadInlineActivitySchema = z.object({
  leadId: z.uuid(),
  type: z.enum(["call", "email"]),
});
