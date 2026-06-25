import "server-only";
import { and, sql, gte, lte, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { attendanceRecords, employees, departments } from "@/lib/db/schema";
import { getMonthBounds } from "@/lib/time";
import type { ReportResult } from "./types";

type Params = {
  year: number;
  month: number;
  from: string;
  to: string;
  employeeId?: string;
  departmentId?: string;
};

export async function getAttendanceReport(params: Params): Promise<ReportResult> {
  const db = getDb();
  const hasDateRange = !!(params.from && params.to);
  const dateStart = hasDateRange ? params.from : getMonthBounds(params.year, params.month).start;
  const dateEnd = hasDateRange ? params.to : getMonthBounds(params.year, params.month).end;

  const conditions: ReturnType<typeof and>[] = [
    gte(attendanceRecords.attendanceDate, dateStart),
    lte(attendanceRecords.attendanceDate, dateEnd),
  ];

  if (params.departmentId) {
    const rows = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.departmentId, params.departmentId));
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      conditions.push(inArray(attendanceRecords.employeeId, ids));
    }
  }
  if (params.employeeId) {
    conditions.push(eq(attendanceRecords.employeeId, params.employeeId));
  }

  const whereClause = and(...conditions);

  const [statusCounts, employeeStats] = await Promise.all([
    db
      .select({
        status: attendanceRecords.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendanceRecords)
      .where(whereClause)
      .groupBy(attendanceRecords.status),
    db
      .select({
        employeeName: employees.fullName,
        designation: employees.designation,
        departmentName: departments.name,
        present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')::int`,
        late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'late')::int`,
        absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')::int`,
        halfDay: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'half_day')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(whereClause)
      .groupBy(employees.fullName, employees.designation, departments.name)
      .orderBy(employees.fullName),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]));
  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

  return {
    title: "Attendance Summary",
    description: `Attendance report for ${hasDateRange ? `${params.from} – ${params.to}` : `${params.month}/${params.year}`}`,
    summaryCards: [
      { label: "Present", value: statusMap["present"] ?? 0, tone: "green" },
      { label: "Late", value: statusMap["late"] ?? 0, tone: "amber" },
      { label: "Absent", value: statusMap["absent"] ?? 0, tone: "red" },
      { label: "Half Day", value: statusMap["half_day"] ?? 0, tone: "blue" },
      { label: "Total Records", value: total, tone: "purple" },
    ],
    columns: [
      { key: "employeeName", label: "Employee" },
      { key: "designation", label: "Designation" },
      { key: "departmentName", label: "Department", format: "text" },
      { key: "present", label: "Present", format: "number" },
      { key: "late", label: "Late", format: "number" },
      { key: "absent", label: "Absent", format: "number" },
      { key: "halfDay", label: "Half Day", format: "number" },
      { key: "total", label: "Total", format: "number" },
    ],
    rows: employeeStats.map((r) => ({ ...r })),
    chartData: statusCounts.map((s) => ({
      name: s.status.charAt(0).toUpperCase() + s.status.slice(1).replace("_", " "),
      value: s.count,
    })),
    chartType: "pie",
  };
}
