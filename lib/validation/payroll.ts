import { z } from "zod";

export const salaryStructureSchema = z.object({
  employeeId: z.uuid(),
  effectiveFrom: z.string().min(1, "Effective from date is required."),
  effectiveTo: z.string().optional(),
  basicSalaryCents: z.coerce.number().int().min(0).default(0),
  housingAllowanceCents: z.coerce.number().int().min(0).default(0),
  transportAllowanceCents: z.coerce.number().int().min(0).default(0),
  medicalAllowanceCents: z.coerce.number().int().min(0).default(0),
  grossSalaryCents: z.coerce.number().int().min(0).default(0),
});

export const salaryStructureUpdateSchema = salaryStructureSchema.extend({
  id: z.uuid(),
});

export const deductionDefinitionSchema = z.object({
  name: z.string().min(2, "Name is required.").trim(),
  code: z.string().min(2, "Code is required.").trim().toUpperCase(),
  description: z.string().optional(),
  category: z.enum(["tax", "insurance", "loan", "other"]).default("other"),
  type: z.enum(["percentage", "fixed"]).default("fixed"),
  defaultValueCents: z.coerce.number().int().min(0).default(0),
  defaultRate: z.coerce.number().int().min(0).max(100).default(0),
  isMandatory: z.coerce.boolean().default(false),
});

export const deductionDefinitionUpdateSchema = deductionDefinitionSchema.extend({
  id: z.uuid(),
});

export const employeeDeductionSchema = z.object({
  employeeId: z.uuid(),
  deductionId: z.uuid(),
  amountCents: z.coerce.number().int().min(0).optional(),
  rate: z.coerce.number().int().min(0).max(100).optional(),
  isPercentage: z.coerce.boolean().default(false),
  effectiveFrom: z.string().min(1, "Effective from date is required."),
  effectiveTo: z.string().optional(),
});

export const employeeDeductionUpdateSchema = employeeDeductionSchema.extend({
  id: z.uuid(),
});

export const bankDetailsSchema = z.object({
  employeeId: z.uuid(),
  bankName: z.string().min(2, "Bank name is required.").trim(),
  branchName: z.string().optional(),
  accountNumber: z.string().min(1, "Account number is required.").trim(),
  accountHolderName: z.string().min(2, "Account holder name is required.").trim(),
  ifscCode: z.string().optional(),
  swiftCode: z.string().optional(),
});

export const bankDetailsUpdateSchema = bankDetailsSchema.extend({
  id: z.uuid(),
});

export const payrollPeriodSchema = z.object({
  periodName: z.string().min(2, "Period name is required.").trim(),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  paymentDate: z.string().optional(),
});

export const payrollRunUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "paid", "failed"]),
  paymentMethod: z.string().optional(),
});
