import { z } from "zod/v4";

export const expenseClaimSchema = z.object({
  employeeId: z.uuid(),
  title: z.string().min(1, "Title is required.").trim(),
  description: z.string().optional(),
});

export const expenseItemSchema = z.object({
  categoryId: z.uuid().optional(),
  description: z.string().min(1, "Description is required.").trim(),
  amountCents: z.number().int().min(1, "Amount must be greater than 0."),
  expenseDate: z.string().min(1, "Date is required."),
});

export const expenseClaimSubmitSchema = z.object({
  title: z.string().min(1, "Title is required.").trim(),
  description: z.string().optional(),
  items: z.array(expenseItemSchema).min(1, "At least one expense item is required."),
});

export const expenseReviewSchema = z.object({
  id: z.uuid(),
  status: z.enum(["approved", "rejected"]),
  adminNotes: z.string().optional(),
});

export const expenseReimburseSchema = z.object({
  claimId: z.uuid(),
  amountCents: z.number().int().min(1),
  reimbursedDate: z.string().min(1),
  method: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseCategorySchema = z.object({
  name: z.string().min(1, "Name is required.").trim(),
  description: z.string().optional(),
  type: z.enum(["travel", "office_supplies", "meals", "utilities", "software", "transportation", "accommodation", "entertainment", "other"]),
});

export const expenseLinkInvoiceSchema = z.object({
  expenseClaimId: z.uuid(),
  invoiceId: z.uuid(),
  amountCents: z.number().int().min(1),
});
