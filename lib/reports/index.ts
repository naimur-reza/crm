import "server-only";
import type { ReportType, ReportResult } from "./types";
import { getAttendanceReport } from "./attendance";
import { getCrmFunnelReport } from "./crm";
import { getRevenueReport } from "./revenue";
import { getExpenseReport } from "./expenses";
import { getPayrollReport } from "./payroll";
import { getTaskReport } from "./tasks";
import { getLeaveReport } from "./leaves";
import { getExecutiveReport } from "./executive";

export type { ReportType, ReportResult, ReportMeta, SummaryCard, ReportColumn } from "./types";
export { REPORT_METAS } from "./types";

type ReportParams = {
  type: ReportType;
  year: number;
  month: number;
  from: string;
  to: string;
  employeeId?: string;
  departmentId?: string;
};

export async function generateReport(params: ReportParams): Promise<ReportResult> {
  switch (params.type) {
    case "attendance":
      return getAttendanceReport(params);
    case "crm-funnel":
      return getCrmFunnelReport();
    case "revenue":
      return getRevenueReport();
    case "expenses":
      return getExpenseReport();
    case "payroll":
      return getPayrollReport();
    case "tasks":
      return getTaskReport();
    case "leaves":
      return getLeaveReport();
    case "executive":
      return getExecutiveReport();
    default:
      throw new Error(`Unknown report type: ${params.type}`);
  }
}
