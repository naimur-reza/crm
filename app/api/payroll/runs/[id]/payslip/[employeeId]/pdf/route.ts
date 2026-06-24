import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import {
  payrollRuns,
  payrollPeriods,
  employees,
  departments,
  employeeBankDetails,
  salaryStructures,
} from "@/lib/db/schema";
import { generatePayslipPdf } from "@/lib/payroll/pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; employeeId: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user, "payroll_runs")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id: periodId, employeeId } = await params;

  const [run] = await getDb()
    .select({
      grossPayCents: payrollRuns.grossPayCents,
      totalDeductionsCents: payrollRuns.totalDeductionsCents,
      netPayCents: payrollRuns.netPayCents,
      earningsBreakdown: payrollRuns.earningsBreakdown,
      deductionsBreakdown: payrollRuns.deductionsBreakdown,
      attendanceSummary: payrollRuns.attendanceSummary,
      employeeName: employees.fullName,
      employeeDesignation: employees.designation,
      employeeJoiningDate: employees.joiningDate,
      departmentName: departments.name,
      periodName: payrollPeriods.periodName,
    })
    .from(payrollRuns)
    .innerJoin(payrollPeriods, eq(payrollRuns.payrollPeriodId, payrollPeriods.id))
    .innerJoin(employees, eq(payrollRuns.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(payrollRuns.payrollPeriodId, periodId),
          eq(payrollRuns.employeeId, employeeId),
        ),
      )
    .limit(1);

  if (!run) {
    return new NextResponse("Payroll run not found", { status: 404 });
  }

  const [bank] = await getDb()
    .select({
      bankName: employeeBankDetails.bankName,
      accountNumber: employeeBankDetails.accountNumber,
    })
    .from(employeeBankDetails)
    .where(eq(employeeBankDetails.employeeId, employeeId))
    .limit(1);

  const companyName = process.env.COMPANY_INVOICE_NAME || "Company Tools Limited";
  const companyAddress = process.env.COMPANY_INVOICE_ADDRESS || "";

  const { bytes } = await generatePayslipPdf({
    companyName,
    companyAddress,
    periodName: run.periodName,
    employeeName: run.employeeName,
    employeeDesignation: run.employeeDesignation,
    departmentName: run.departmentName ?? "—",
    joiningDate: run.employeeJoiningDate ?? "",
    bankName: bank?.bankName ?? "—",
    accountNumber: bank?.accountNumber ?? "—",
    grossPayCents: run.grossPayCents,
    totalDeductionsCents: run.totalDeductionsCents,
    netPayCents: run.netPayCents,
    earningsBreakdown: run.earningsBreakdown as Record<string, number>,
    deductionsBreakdown: run.deductionsBreakdown as Record<string, { name: string; amountCents: number }>,
    attendanceSummary: run.attendanceSummary as Record<string, number>,
  });

  const filename = `payslip-${run.employeeName.replace(/\s+/g, "-").toLowerCase()}-${run.periodName.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
