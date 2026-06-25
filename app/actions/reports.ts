"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { generateReport, type ReportType } from "@/lib/reports";

export async function getReportData(
  type: ReportType,
  params: {
    year: number;
    month: number;
    from: string;
    to: string;
    employeeId?: string;
    departmentId?: string;
  },
) {
  const user = await requireUser();
  requirePermission(user, "reports");

  return generateReport({
    type,
    year: params.year,
    month: params.month,
    from: params.from,
    to: params.to,
    employeeId: params.employeeId,
    departmentId: params.departmentId,
  });
}
