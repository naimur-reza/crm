import "server-only";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  employees,
  salaryStructures,
  employeeDeductions,
  deductionDefinitions,
  attendanceRecords,
  leaveRequests,
} from "@/lib/db/schema";
import { getMonthBounds } from "@/lib/time";

type EarningsBreakdown = Record<string, number>;
type DeductionsBreakdown = Record<string, { name: string; amountCents: number }>;
type AttendanceSummary = {
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
};

export type PayrollCalculationResult = {
  employeeId: string;
  employeeName: string;
  grossPayCents: number;
  totalDeductionsCents: number;
  netPayCents: number;
  earningsBreakdown: EarningsBreakdown;
  deductionsBreakdown: DeductionsBreakdown;
  attendanceSummary: AttendanceSummary;
};

export async function calculateEmployeePayroll(
  employeeId: string,
  year: number,
  month: number,
): Promise<PayrollCalculationResult | null> {
  const { start, end } = getMonthBounds(year, month);

  const [employee] = await getDb()
    .select({ id: employees.id, fullName: employees.fullName })
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.status, "active")))
    .limit(1);

  if (!employee) return null;

  const [structure] = await getDb()
    .select()
    .from(salaryStructures)
    .where(
      and(
        eq(salaryStructures.employeeId, employeeId),
        lte(salaryStructures.effectiveFrom, end),
        sql`(${salaryStructures.effectiveTo} is null or ${salaryStructures.effectiveTo} >= ${start})`,
      ),
    )
    .orderBy(sql`${salaryStructures.createdAt} desc`)
    .limit(1);

  if (!structure) return null;

  const attendanceRows = await getDb()
    .select({
      status: attendanceRecords.status,
      count: sql<number>`count(*)::int`,
    })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        gte(attendanceRecords.attendanceDate, start),
        lte(attendanceRecords.attendanceDate, end),
      ),
    )
    .groupBy(attendanceRecords.status);

  const attendanceSummary: AttendanceSummary = {
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
  };

  for (const row of attendanceRows) {
    if (row.status === "present") attendanceSummary.presentDays = row.count;
    else if (row.status === "late") attendanceSummary.lateDays = row.count;
    else if (row.status === "absent") attendanceSummary.absentDays = row.count;
    else if (row.status === "half_day") attendanceSummary.halfDays = row.count;
  }

  attendanceSummary.workingDays = attendanceSummary.presentDays + attendanceSummary.lateDays + attendanceSummary.absentDays + attendanceSummary.halfDays;

  const grossPayCents = structure.grossSalaryCents;

  const earningsBreakdown: EarningsBreakdown = {
    basic: structure.basicSalaryCents,
    housing: structure.housingAllowanceCents,
    transport: structure.transportAllowanceCents,
    medical: structure.medicalAllowanceCents,
    gross: grossPayCents,
  };

  if (structure.otherAllowancesCents && typeof structure.otherAllowancesCents === "object") {
    for (const [key, val] of Object.entries(structure.otherAllowancesCents as Record<string, number>)) {
      earningsBreakdown[key] = val;
    }
  }

  const assignedDeductions = await getDb()
    .select({
      id: employeeDeductions.id,
      amountCents: employeeDeductions.amountCents,
      rate: employeeDeductions.rate,
      isPercentage: employeeDeductions.isPercentage,
      deductionName: deductionDefinitions.name,
      deductionCode: deductionDefinitions.code,
      deductionType: deductionDefinitions.type,
      deductionCategory: deductionDefinitions.category,
      defaultValueCents: deductionDefinitions.defaultValueCents,
      defaultRate: deductionDefinitions.defaultRate,
    })
    .from(employeeDeductions)
    .innerJoin(
      deductionDefinitions,
      eq(employeeDeductions.deductionId, deductionDefinitions.id),
    )
    .where(
      and(
        eq(employeeDeductions.employeeId, employeeId),
        lte(employeeDeductions.effectiveFrom, end),
        sql`(${employeeDeductions.effectiveTo} is null or ${employeeDeductions.effectiveTo} >= ${start})`,
      ),
    );

  const deductionsBreakdown: DeductionsBreakdown = {};
  let totalDeductionsCents = 0;

  for (const d of assignedDeductions) {
    const amount = d.isPercentage
      ? Math.round(grossPayCents * ((d.rate ?? d.defaultRate) / 100))
      : (d.amountCents ?? d.defaultValueCents);

    if (amount > 0) {
      deductionsBreakdown[d.deductionCode] = {
        name: d.deductionName,
        amountCents: amount,
      };
      totalDeductionsCents += amount;
    }
  }

  const netPayCents = Math.max(0, grossPayCents - totalDeductionsCents);

  return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    grossPayCents,
    totalDeductionsCents,
    netPayCents,
    earningsBreakdown,
    deductionsBreakdown,
    attendanceSummary,
  };
}
