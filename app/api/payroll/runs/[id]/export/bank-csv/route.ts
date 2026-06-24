import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { payrollRuns, payrollPeriods, employees, employeeBankDetails } from "@/lib/db/schema";
import { generateBankCsv } from "@/lib/payroll/bank-export";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user, "payroll_runs")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const [period] = await getDb()
    .select({ periodName: payrollPeriods.periodName })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, id))
    .limit(1);

  if (!period) return new NextResponse("Period not found", { status: 404 });

  const runs = await getDb()
    .select({
      netPayCents: payrollRuns.netPayCents,
      employeeName: employees.fullName,
      bankName: employeeBankDetails.bankName,
      accountNumber: employeeBankDetails.accountNumber,
      accountHolderName: employeeBankDetails.accountHolderName,
      ifscCode: employeeBankDetails.ifscCode,
    })
    .from(payrollRuns)
    .innerJoin(employees, eq(payrollRuns.employeeId, employees.id))
    .innerJoin(employeeBankDetails, eq(employeeBankDetails.employeeId, employees.id))
    .where(eq(payrollRuns.payrollPeriodId, id))
    .orderBy(employees.fullName);

  const csv = generateBankCsv(
    runs.map((r) => ({
      employeeName: r.employeeName,
      bankName: r.bankName,
      accountNumber: r.accountNumber,
      accountHolderName: r.accountHolderName,
      ifscCode: r.ifscCode ?? "",
      netPayCents: r.netPayCents,
    })),
  );

  const filename = `bank-transfer-${period.periodName.replace(/\s+/g, "-").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
