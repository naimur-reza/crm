import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { Download } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeader, Surface } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceRecords, departments, employees } from "@/lib/db/schema";
import { ReportFilters } from "./report-filters";

function getMonthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function formatTime(value: Date | null) {
  return value?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "-";
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
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function AttendanceReportsPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "attendance_reports")) redirect("/dashboard");

  const sp = await props.searchParams;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const year = sp.year ? parseInt(sp.year) : currentYear;
  const month = sp.month ? parseInt(sp.month) : currentMonth;
  const employeeId = sp.employeeId || "";
  const statusFilter = sp.status || "";

  const { start, end } = getMonthBounds(year, month);

  const filters: ReturnType<typeof eq | typeof gte | typeof lte>[] = [
    gte(attendanceRecords.attendanceDate, start),
    lte(attendanceRecords.attendanceDate, end),
  ];
  if (employeeId) filters.push(eq(attendanceRecords.employeeId, employeeId));
  if (statusFilter) {
    filters.push(eq(attendanceRecords.status, statusFilter as "present" | "late" | "absent" | "half_day"));
  }

  const [records, employeeList] = await Promise.all([
    getDb()
      .select({
        id: attendanceRecords.id,
        attendanceDate: attendanceRecords.attendanceDate,
        checkInAt: attendanceRecords.checkInAt,
        checkOutAt: attendanceRecords.checkOutAt,
        status: attendanceRecords.status,
        source: attendanceRecords.source,
        notes: attendanceRecords.notes,
        employeeId: employees.id,
        employeeName: employees.fullName,
        employeeDesignation: employees.designation,
        departmentName: departments.name,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...filters))
      .orderBy(desc(attendanceRecords.attendanceDate)),
    getDb()
      .select({ id: employees.id, name: employees.fullName })
      .from(employees)
      .orderBy(employees.fullName),
  ]);

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const csvParams = new URLSearchParams({ month: String(month), year: String(year) });
  if (employeeId) csvParams.set("employeeId", employeeId);
  if (statusFilter) csvParams.set("status", statusFilter);
  const csvUrl = `/api/attendance/reports/csv?${csvParams.toString()}`;

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const halfDayCount = records.filter((r) => r.status === "half_day").length;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Attendance Reports"
        description="View and download monthly attendance reports. Only admins can access this page."
      />

      <Surface className="p-5">
        <ReportFilters
          year={year}
          month={month}
          employeeId={employeeId}
          status={statusFilter}
          employees={employeeList}
        />
      </Surface>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Present", value: presentCount, className: "text-emerald-700" },
          { label: "Late", value: lateCount, className: "text-amber-700" },
          { label: "Absent", value: absentCount, className: "text-rose-700" },
          { label: "Half day", value: halfDayCount, className: "text-sky-700" },
        ].map((item) => (
          <Surface key={item.label} className="p-4">
            <p className="text-xs font-medium text-slate-600">{item.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${item.className}`}>{item.value}</p>
          </Surface>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Records for {monthLabel}
          </h2>
          <p className="text-sm text-slate-500">
            {records.length} record{records.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <a
          href={csvUrl}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#3995d2] px-4 text-sm font-semibold text-white transition hover:bg-[#2f80bd]"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </a>
      </div>

      <DataTable
        headers={["Employee", "Department", "Date", "Session", "Status", "Source", "Notes"]}
        empty="No attendance records found for the selected filters."
        rows={records.map((record) => [
          <div key="emp">
            <p className="font-medium text-slate-950">{record.employeeName}</p>
            <p className="text-xs text-slate-500">{record.employeeDesignation}</p>
          </div>,
          <span key="dept" className="text-sm text-slate-600">
            {record.departmentName ?? "-"}
          </span>,
          <span key="date" className="font-mono text-xs text-slate-600">
            {record.attendanceDate}
          </span>,
          <div key="session" className="text-sm">
            <p className="font-medium text-slate-950">
              {formatTime(record.checkInAt)} - {formatTime(record.checkOutAt)}
            </p>
          </div>,
          <Badge key="status" tone={statusBadgeTone(record.status)}>
            {statusLabel(record.status)}
          </Badge>,
          <span key="source" className="text-sm capitalize">
            {record.source}
          </span>,
          <span key="notes" className="text-sm text-slate-500">
            {record.notes ?? "-"}
          </span>,
        ])}
      />
    </div>
  );
}
