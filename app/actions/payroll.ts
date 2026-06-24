"use server";

import { revalidatePath } from "next/cache";
import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  salaryStructures,
  deductionDefinitions,
  employeeDeductions,
  employeeBankDetails,
  payrollPeriods,
  payrollRuns,
  payslips,
  employees,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/db/queries/audit";
import {
  salaryStructureSchema,
  salaryStructureUpdateSchema,
  deductionDefinitionSchema,
  deductionDefinitionUpdateSchema,
  employeeDeductionSchema,
  employeeDeductionUpdateSchema,
  bankDetailsSchema,
  bankDetailsUpdateSchema,
  payrollPeriodSchema,
  payrollRunUpdateSchema,
} from "@/lib/validation/payroll";
import { calculateEmployeePayroll } from "@/lib/payroll/calculator";
import { getLocalYear, getLocalMonth, getMonthBounds } from "@/lib/time";

// ── Salary Structures ──

export async function createSalaryStructure(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll");

  const parsed = salaryStructureSchema.parse(Object.fromEntries(formData));
  const gross = parsed.grossSalaryCents ||
    parsed.basicSalaryCents + parsed.housingAllowanceCents + parsed.transportAllowanceCents + parsed.medicalAllowanceCents;

  const [structure] = await getDb()
    .insert(salaryStructures)
    .values({ ...parsed, grossSalaryCents: gross })
    .returning({ id: salaryStructures.id });

  await logAudit(user.id, "salary_structure.created", "salary_structure", structure.id, parsed);
  revalidatePath("/payroll/salary-structures");
}

export async function updateSalaryStructure(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll");

  const parsed = salaryStructureUpdateSchema.parse(Object.fromEntries(formData));
  const gross = parsed.grossSalaryCents ||
    parsed.basicSalaryCents + parsed.housingAllowanceCents + parsed.transportAllowanceCents + parsed.medicalAllowanceCents;

  await getDb()
    .update(salaryStructures)
    .set({ ...parsed, grossSalaryCents: gross })
    .where(eq(salaryStructures.id, parsed.id));

  await logAudit(user.id, "salary_structure.updated", "salary_structure", parsed.id, parsed);
  revalidatePath("/payroll/salary-structures");
}

// ── Deduction Definitions ──

export async function createDeductionDefinition(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll");

  const parsed = deductionDefinitionSchema.parse(Object.fromEntries(formData));

  const [def] = await getDb()
    .insert(deductionDefinitions)
    .values(parsed)
    .returning({ id: deductionDefinitions.id });

  await logAudit(user.id, "deduction_definition.created", "deduction_definition", def.id, parsed);
  revalidatePath("/payroll/deductions");
}

export async function updateDeductionDefinition(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll");

  const parsed = deductionDefinitionUpdateSchema.parse(Object.fromEntries(formData));

  await getDb()
    .update(deductionDefinitions)
    .set(parsed)
    .where(eq(deductionDefinitions.id, parsed.id));

  await logAudit(user.id, "deduction_definition.updated", "deduction_definition", parsed.id, parsed);
  revalidatePath("/payroll/deductions");
}

export async function deleteDeductionDefinition(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll");

  const id = formData.get("id") as string;
  await getDb().delete(deductionDefinitions).where(eq(deductionDefinitions.id, id));
  await logAudit(user.id, "deduction_definition.deleted", "deduction_definition", id, {});
  revalidatePath("/payroll/deductions");
}

// ── Employee Deductions ──

export async function assignEmployeeDeduction(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll");

  const parsed = employeeDeductionSchema.parse(Object.fromEntries(formData));

  await getDb().insert(employeeDeductions).values(parsed);
  await logAudit(user.id, "employee_deduction.created", "employee_deduction", undefined, parsed);
  revalidatePath("/payroll/employee-deductions");
}

export async function removeEmployeeDeduction(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll");

  const id = formData.get("id") as string;
  await getDb().delete(employeeDeductions).where(eq(employeeDeductions.id, id));
  await logAudit(user.id, "employee_deduction.deleted", "employee_deduction", id, {});
  revalidatePath("/payroll/employee-deductions");
}

// ── Bank Details ──

export async function saveBankDetails(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll");

  const parsed = bankDetailsSchema.parse(Object.fromEntries(formData));

  const existing = await getDb()
    .select({ id: employeeBankDetails.id })
    .from(employeeBankDetails)
    .where(eq(employeeBankDetails.employeeId, parsed.employeeId))
    .limit(1);

  if (existing.length > 0) {
    await getDb()
      .update(employeeBankDetails)
      .set(parsed)
      .where(eq(employeeBankDetails.id, existing[0].id));
  } else {
    await getDb().insert(employeeBankDetails).values(parsed);
  }

  await logAudit(user.id, "bank_details.saved", "bank_details", undefined, parsed);
  revalidatePath("/payroll/bank-details");
}

// ── Payroll Periods / Runs ──

export async function createPayrollPeriod(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll_runs");

  const parsed = payrollPeriodSchema.parse(Object.fromEntries(formData));

  const [period] = await getDb()
    .insert(payrollPeriods)
    .values(parsed)
    .returning({ id: payrollPeriods.id });

  await logAudit(user.id, "payroll_period.created", "payroll_period", period.id, parsed);
  revalidatePath("/payroll/runs");
}

export async function runPayrollCalculation(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll_runs");

  const periodId = formData.get("periodId") as string;
  const [period] = await getDb()
    .select()
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, periodId))
    .limit(1);

  if (!period) throw new Error("Payroll period not found.");

  const startDate = new Date(`${period.startDate}T00:00:00`);
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;

  const activeEmployees = await getDb()
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.status, "active"));

  let processed = 0;
  let skipped = 0;

  for (const emp of activeEmployees) {
    const result = await calculateEmployeePayroll(emp.id, year, month);
    if (!result) { skipped++; continue; }

    await getDb().insert(payrollRuns).values({
      payrollPeriodId: periodId,
      employeeId: result.employeeId,
      grossPayCents: result.grossPayCents,
      totalDeductionsCents: result.totalDeductionsCents,
      netPayCents: result.netPayCents,
      earningsBreakdown: result.earningsBreakdown as Record<string, number>,
      deductionsBreakdown: result.deductionsBreakdown as Record<string, { name: string; amountCents: number }>,
      attendanceSummary: result.attendanceSummary as Record<string, number>,
      status: "pending",
    });
    processed++;
  }

  await getDb()
    .update(payrollPeriods)
    .set({ processedBy: user.id, processedAt: new Date() })
    .where(eq(payrollPeriods.id, periodId));

  await logAudit(user.id, "payroll_run.calculated", "payroll_period", periodId, {
    processed,
    skipped,
    totalEmployees: activeEmployees.length,
  });

  revalidatePath(`/payroll/runs/${periodId}`);
}

export async function confirmPayrollRun(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll_runs");

  const periodId = formData.get("periodId") as string;

  await getDb()
    .update(payrollPeriods)
    .set({ status: "completed" })
    .where(eq(payrollPeriods.id, periodId));

  await logAudit(user.id, "payroll_period.completed", "payroll_period", periodId, {});
  revalidatePath(`/payroll/runs/${periodId}`);
}

export async function updatePayrollRunStatus(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll_runs");

  const parsed = payrollRunUpdateSchema.parse(Object.fromEntries(formData));

  await getDb()
    .update(payrollRuns)
    .set({
      status: parsed.status,
      paymentMethod: parsed.paymentMethod,
      paidAt: parsed.status === "paid" ? new Date() : undefined,
    })
    .where(eq(payrollRuns.id, parsed.id));

  await logAudit(user.id, "payroll_run.status_updated", "payroll_run", parsed.id, parsed);
  revalidatePath("/payroll/runs");
}

export async function generatePayslips(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "payroll_runs");

  const periodId = formData.get("periodId") as string;

  const runs = await getDb()
    .select({
      id: payrollRuns.id,
      employeeId: payrollRuns.employeeId,
    })
    .from(payrollRuns)
    .where(eq(payrollRuns.payrollPeriodId, periodId));

  for (const run of runs) {
    const existing = await getDb()
      .select({ id: payslips.id })
      .from(payslips)
      .where(eq(payslips.payrollRunId, run.id))
      .limit(1);

    if (existing.length === 0) {
      await getDb().insert(payslips).values({
        payrollRunId: run.id,
        employeeId: run.employeeId,
      });
    }
  }

  await logAudit(user.id, "payslips.generated", "payroll_period", periodId, { count: runs.length });
  revalidatePath(`/payroll/runs/${periodId}`);
}
