import { redirect } from "next/navigation";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Download, FileText, TimerReset, TrendingUp, Clock3, Percent } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceRecords, departments, employees } from "@/lib/db/schema";
import { formatDate, formatTime12 } from "@/lib/time";
import { ReportFilters } from "./report-filters";

function getMonthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function statusBadgeTone(status: string): "green" | "amber" | "red" | "blue" {
  const map: Record<string, "green" | "amber" | "red" | "blue"> = {
    present: "green",
    late: "amber",
    absent: "red",
    half_day: "blue",
  };
  return map[status] ?? "green";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    present: "Present",
    late: "Late",
    absent: "Absent",
    half_day: "Half day",
  };
  return map[status] ?? status;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function AttendanceReportsPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "attendance_reports")) redirect("/dashboard");

  const sp = await props.searchParams;
  const { page, pageSize, offset } = getPaginationParams(sp);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const year = sp.year ? parseInt(sp.year) : currentYear;
  const month = sp.month ? parseInt(sp.month) : currentMonth;
  const from = sp.from || "";
  const to = sp.to || "";
  const employeeId = sp.employeeId || "";
  const departmentId = sp.departmentId || "";
  const statusFilter = sp.status || "";

  const hasDateRange = !!(from && to);
  const dateStart = hasDateRange ? from : getMonthBounds(year, month).start;
  const dateEnd = hasDateRange ? to : getMonthBounds(year, month).end;

  const db = getDb();

  const conditions: ReturnType<typeof and>[] = [
    gte(attendanceRecords.attendanceDate, dateStart),
    lte(attendanceRecords.attendanceDate, dateEnd),
  ];

  let employeeIdsInDepartment: string[] | null = null;
  if (departmentId) {
    const rows = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.departmentId, departmentId));
    employeeIdsInDepartment = rows.map((r) => r.id);
    if (employeeIdsInDepartment.length > 0) {
      conditions.push(inArray(attendanceRecords.employeeId, employeeIdsInDepartment));
    } else {
      conditions.push(eq(attendanceRecords.employeeId, "00000000-0000-0000-0000-000000000000"));
    }
  }
  if (employeeId) conditions.push(eq(attendanceRecords.employeeId, employeeId));
  if (statusFilter) {
    conditions.push(
      eq(
        attendanceRecords.status,
        statusFilter as "present" | "late" | "absent" | "half_day",
      ),
    );
  }

  const whereClause = and(...conditions);

  const [countResult, statusCounts, records, employeeList, departmentList] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(whereClause)
      .then((r) => r[0]),
    db
      .select({
        status: attendanceRecords.status,
        count: sql<number>`count(*)::int`,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(whereClause)
      .groupBy(attendanceRecords.status),
    db
      .select({
        id: attendanceRecords.id,
        attendanceDate: attendanceRecords.attendanceDate,
        checkInAt: attendanceRecords.checkInAt,
        checkOutAt: attendanceRecords.checkOutAt,
        status: attendanceRecords.status,
        employeeId: employees.id,
        employeeName: employees.fullName,
        employeeDesignation: employees.designation,
        departmentName: departments.name,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(whereClause)
      .orderBy(desc(attendanceRecords.attendanceDate))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ id: employees.id, name: employees.fullName })
      .from(employees)
      .orderBy(employees.fullName),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .orderBy(departments.name),
  ]);

  const pagination = buildPagination(page, pageSize, countResult.count);

  const statusCountMap = Object.fromEntries(
    statusCounts.map((s) => [s.status, s.count]),
  );
  const presentCount = statusCountMap["present"] ?? 0;
  const lateCount = statusCountMap["late"] ?? 0;
  const absentCount = statusCountMap["absent"] ?? 0;
  const halfDayCount = statusCountMap["half_day"] ?? 0;

  const monthLabel = hasDateRange
    ? `${from} – ${to}`
    : `${MONTH_NAMES[month - 1]} ${year}`;

  const csvParams = new URLSearchParams();
  if (hasDateRange) {
    csvParams.set("from", from);
    csvParams.set("to", to);
  } else {
    csvParams.set("month", String(month));
    csvParams.set("year", String(year));
  }
  if (employeeId) csvParams.set("employeeId", employeeId);
  if (departmentId) csvParams.set("departmentId", departmentId);
  if (statusFilter) csvParams.set("status", statusFilter);
  const csvUrl = `/api/attendance/reports/csv?${csvParams.toString()}`;
  const pdfUrl = `/api/attendance/reports/pdf?${csvParams.toString()}`;

  return (
    <div className="-m-4 grid gap-6 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.30),transparent_34%),linear-gradient(180deg,#eef7fc_0%,#f8fbfd_46%,#ffffff_100%)] p-4 sm:-m-6 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Reports
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
            Attendance Reports
          </h1>
        </div>
      </div>

      {/* Summary Cards — computed via aggregate SQL over the full filtered dataset */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Surface className="group relative min-h-32 overflow-hidden border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] hover:shadow-[0_18px_48px_rgba(31,92,132,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Present</p>
              <p className="mt-4 text-4xl font-bold leading-none text-emerald-700">{presentCount}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">Records</p>
            </div>
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
        </Surface>
        <Surface className="group relative min-h-32 overflow-hidden border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] hover:shadow-[0_18px_48px_rgba(31,92,132,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Late</p>
              <p className="mt-4 text-4xl font-bold leading-none text-amber-700">{lateCount}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">Records</p>
            </div>
            <span className="rounded-xl bg-amber-50 p-2 text-amber-700 ring-1 ring-amber-100">
              <Clock3 className="h-4 w-4" />
            </span>
          </div>
        </Surface>
        <Surface className="group relative min-h-32 overflow-hidden border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] hover:shadow-[0_18px_48px_rgba(31,92,132,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Absent</p>
              <p className="mt-4 text-4xl font-bold leading-none text-rose-700">{absentCount}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">Records</p>
            </div>
            <span className="rounded-xl bg-rose-50 p-2 text-rose-700 ring-1 ring-rose-100">
              <Percent className="h-4 w-4" />
            </span>
          </div>
        </Surface>
        <Surface className="group relative min-h-32 overflow-hidden border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] hover:shadow-[0_18px_48px_rgba(31,92,132,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Half day</p>
              <p className="mt-4 text-4xl font-bold leading-none text-sky-700">{halfDayCount}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">Records</p>
            </div>
            <span className="rounded-xl bg-sky-50 p-2 text-sky-700 ring-1 ring-sky-100">
              <TimerReset className="h-4 w-4" />
            </span>
          </div>
        </Surface>
      </div>

      {/* Filters */}
      <ReportFilters
        year={year}
        month={month}
        from={from}
        to={to}
        employeeId={employeeId}
        departmentId={departmentId}
        status={statusFilter}
        employees={employeeList}
        departments={departmentList}
      />

      {/* Main Content */}
      <Surface className="overflow-hidden border-sky-100 bg-white/95 p-0 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-1 rounded-full bg-sky-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                  Records
                </p>
                <h2 className="mt-0.5 text-base font-black text-slate-800">
                  Records for {monthLabel} ({countResult.count})
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={pdfUrl}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-50"
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </a>
              <a
                href={csvUrl}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </a>
            </div>
          </div>
        </div>

        <div className="p-5">
          <DataTable
            headers={[
              "Employee",
              "Department",
              "Date",
              "Check In",
              "Check Out",
              "Status",
            ]}
            empty="No attendance records found for the selected filters."
            rows={records.map((record) => [
              <div key="emp">
                <p className="font-medium text-foreground">{record.employeeName}</p>
                <p className="text-xs text-muted-foreground">
                  {record.employeeDesignation}
                </p>
              </div>,
              <span key="dept" className="text-sm text-muted-foreground">
                {record.departmentName ?? "-"}
              </span>,
              <span key="date" className="text-xs text-muted-foreground">
                {formatDate(record.attendanceDate)}
              </span>,
              <span key="in" className="font-mono text-xs text-muted-foreground">
                {record.checkInAt ? formatTime12(record.checkInAt) : "—"}
              </span>,
              <span key="out" className="font-mono text-xs text-muted-foreground">
                {record.checkOutAt ? formatTime12(record.checkOutAt) : "—"}
              </span>,
              <Badge key="status" tone={statusBadgeTone(record.status)}>
                {statusLabel(record.status)}
              </Badge>,
            ])}
          />
          <Pagination {...pagination} />
        </div>
      </Surface>
    </div>
  );
}
