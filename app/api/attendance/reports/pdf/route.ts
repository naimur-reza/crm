import { NextResponse } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { canAccess } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceRecords, departments, employees } from "@/lib/db/schema";
import { getMonthBounds, getLocalYear, getLocalMonth } from "@/lib/time";
import { generateAttendanceReportPdf } from "@/lib/reports/pdf";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthLabel(hasDateRange: boolean, from: string, to: string, month: number, year: number) {
  if (hasDateRange) return `${from} – ${to}`;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user, "attendance_reports")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const year = parseInt(url.searchParams.get("year") || String(getLocalYear()));
  const month = parseInt(url.searchParams.get("month") || String(getLocalMonth()));
  const employeeId = url.searchParams.get("employeeId") || "";
  const departmentId = url.searchParams.get("departmentId") || "";
  const statusFilter = url.searchParams.get("status") || "";

  const hasDateRange = !!(from && to);
  const dateStart = hasDateRange ? from : getMonthBounds(year, month).start;
  const dateEnd = hasDateRange ? to : getMonthBounds(year, month).end;

  const filters: (ReturnType<typeof eq | typeof gte | typeof lte | typeof inArray>)[] = [
    gte(attendanceRecords.attendanceDate, dateStart),
    lte(attendanceRecords.attendanceDate, dateEnd),
  ];

  if (departmentId) {
    const rows = await getDb()
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.departmentId, departmentId));
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      filters.push(inArray(attendanceRecords.employeeId, ids));
    } else {
      filters.push(eq(attendanceRecords.employeeId, "00000000-0000-0000-0000-000000000000"));
    }
  }
  if (employeeId) filters.push(eq(attendanceRecords.employeeId, employeeId));
  if (statusFilter) {
    filters.push(eq(attendanceRecords.status, statusFilter as "present" | "late" | "absent" | "half_day"));
  }

  const records = await getDb()
    .select({
      employeeName: employees.fullName,
      employeeDesignation: employees.designation,
      departmentName: departments.name,
      attendanceDate: attendanceRecords.attendanceDate,
      checkInAt: attendanceRecords.checkInAt,
      checkOutAt: attendanceRecords.checkOutAt,
      status: attendanceRecords.status,
      source: attendanceRecords.source,
      notes: attendanceRecords.notes,
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(...filters))
    .orderBy(employees.fullName, attendanceRecords.attendanceDate);

  const monthLabel = getMonthLabel(hasDateRange, from, to, month, year);
  const { bytes, filename } = await generateAttendanceReportPdf(records, monthLabel);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
