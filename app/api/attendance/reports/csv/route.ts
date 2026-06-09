import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { canAccess } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceRecords, departments, employees } from "@/lib/db/schema";

function getMonthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function formatTime(value: Date | null) {
  if (!value) return "-";
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.roles, "attendance_reports")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1));
  const employeeId = url.searchParams.get("employeeId") || "";
  const statusFilter = url.searchParams.get("status") || "";

  const { start, end } = getMonthBounds(year, month);

  const filters: ReturnType<typeof eq | typeof gte | typeof lte>[] = [
    gte(attendanceRecords.attendanceDate, start),
    lte(attendanceRecords.attendanceDate, end),
  ];
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
        r.attendanceDate,
        formatTime(r.checkInAt),
        formatTime(r.checkOutAt),
        r.status,
        r.source,
        escapeCsv(r.notes ?? ""),
      ].join(","),
  );

  const csv = [header, ...rows].join("\r\n");

  const monthLabel = `${String(month).padStart(2, "0")}-${year}`;
  const filename = `attendance-report-${monthLabel}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
