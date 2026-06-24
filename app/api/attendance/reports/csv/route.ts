import { NextResponse } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { canAccess } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceRecords, departments, employees } from "@/lib/db/schema";
import { formatDate, formatTime12, getMonthBounds, getLocalYear, getLocalMonth } from "@/lib/time";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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

  const header = "Employee,Designation,Department,Date,Check In,Check Out,Status,Source,Notes";
  const rows = records.map(
    (r) =>
      [
        escapeCsv(r.employeeName),
        escapeCsv(r.employeeDesignation),
        escapeCsv(r.departmentName ?? ""),
        formatDate(r.attendanceDate),
        formatTime12(r.checkInAt),
        formatTime12(r.checkOutAt),
        r.status,
        r.source,
        escapeCsv(r.notes ?? ""),
      ].join(","),
  );

  const csv = [header, ...rows].join("\r\n");

  const label = hasDateRange
    ? `${from}_to_${to}`
    : `${String(month).padStart(2, "0")}-${year}`;
  const filename = `attendance-report-${label}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
