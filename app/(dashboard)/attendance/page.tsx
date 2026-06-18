import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { checkIn, checkOut, correctAttendance } from "@/app/actions/attendance";
import { DataTable } from "@/components/data-table";
import { ModalForm } from "@/components/modal-form";
import { Pagination } from "@/components/pagination";
import { Surface } from "@/components/page-header";
import { Field, Select } from "@/components/ui/field";
import { ToastActionForm } from "@/components/ui/toast-action-form";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceRecords, employees } from "@/lib/db/schema";
import {
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  MinusCircle,
  TimerReset,
} from "lucide-react";

function formatTime(value: Date | null) {
  return (
    value?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "-"
  );
}

function statusMeta(status: string) {
  const map = {
    present: {
      label: "Present",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    late: {
      label: "Late",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    absent: {
      label: "Absent",
      className: "bg-rose-50 text-rose-700 ring-rose-200",
    },
    half_day: {
      label: "Half day",
      className: "bg-sky-50 text-sky-700 ring-sky-200",
    },
  } as const;

  return map[status as keyof typeof map] ?? map.present;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user.roles, "attendance")) redirect("/dashboard");

  const today = new Date().toISOString().slice(0, 10);

  const { page, pageSize, offset } = getPaginationParams(await searchParams);

  const [{ count }, attendanceRows, employeeRows, currentEmployee, todaysRows] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .then((r) => r[0]),
    getDb()
      .select({
        id: attendanceRecords.id,
        attendanceDate: attendanceRecords.attendanceDate,
        checkInAt: attendanceRecords.checkInAt,
        checkOutAt: attendanceRecords.checkOutAt,
        status: attendanceRecords.status,
        employeeName: employees.fullName,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .orderBy(desc(attendanceRecords.attendanceDate))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ id: employees.id, name: employees.fullName })
      .from(employees),
    getDb()
      .select({
        id: employees.id,
        fullName: employees.fullName,
        checkInAt: attendanceRecords.checkInAt,
        checkOutAt: attendanceRecords.checkOutAt,
        status: attendanceRecords.status,
      })
      .from(employees)
      .leftJoin(
        attendanceRecords,
        and(
          eq(attendanceRecords.employeeId, employees.id),
          eq(attendanceRecords.attendanceDate, today),
        ),
      )
      .where(eq(employees.userId, user.id))
      .limit(1),
    getDb()
      .select({
        id: attendanceRecords.id,
        attendanceDate: attendanceRecords.attendanceDate,
        checkInAt: attendanceRecords.checkInAt,
        checkOutAt: attendanceRecords.checkOutAt,
        status: attendanceRecords.status,
        employeeName: employees.fullName,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .where(eq(attendanceRecords.attendanceDate, today))
      .orderBy(desc(attendanceRecords.checkInAt)),
  ]);

  const myAttendance = currentEmployee[0];
  const presentCount = todaysRows.filter(
    (record) => record.status === "present",
  ).length;
  const lateCount = todaysRows.filter(
    (record) => record.status === "late",
  ).length;
  const absentCount = todaysRows.filter(
    (record) => record.status === "absent",
  ).length;
  const halfDayCount = todaysRows.filter(
    (record) => record.status === "half_day",
  ).length;

  const pagination = buildPagination(page, pageSize, count);

  const correctionModal = (
    <ModalForm
      title="Correct attendance"
      description="Create or update an employee attendance record with an audit trail."
      triggerLabel="Correct record"
      action={correctAttendance}
      submitLabel="Save correction"
      formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
    >
      <Select label="Employee" name="employeeId" required>
        <option value="">Choose employee</option>
        {employeeRows.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name}
          </option>
        ))}
      </Select>
      <Field label="Date" name="attendanceDate" type="date" required />
      <Select label="Status" name="status" defaultValue="present">
        <option value="present">Present</option>
        <option value="late">Late</option>
        <option value="absent">Absent</option>
        <option value="half_day">Half day</option>
      </Select>
      <Field label="Notes" name="notes" />
    </ModalForm>
  );

  const checkedIn = !!myAttendance?.checkInAt;
  const checkedOut = !!myAttendance?.checkOutAt;

  return (
    <div className="grid gap-6">

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Surface className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            My Attendance
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            {myAttendance?.fullName ?? "No profile linked"}
          </h2>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
              {myAttendance?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today, {today}</p>
              {checkedIn ? (
                <p className="mt-0.5 text-lg font-semibold text-emerald-600">
                  Checked in at {formatTime(myAttendance.checkInAt)}
                </p>
              ) : (
                <p className="mt-0.5 text-lg font-semibold text-muted-foreground">
                  Not checked in yet
                </p>
              )}
              {checkedOut && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Checked out at {formatTime(myAttendance.checkOutAt)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {!checkedIn ? (
              <ToastActionForm
                action={checkIn}
                successMessage="Checked in successfully."
              >
                <button className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]">
                  <LogIn className="h-5 w-5" />
                  Check In
                </button>
              </ToastActionForm>
            ) : !checkedOut ? (
              <ToastActionForm
                action={checkOut}
                successMessage="Checked out successfully."
              >
                <button className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-card px-4 text-base font-semibold text-muted-foreground shadow-sm transition hover:bg-accent active:scale-[0.98]">
                  <LogOut className="h-5 w-5" />
                  Check Out
                </button>
              </ToastActionForm>
            ) : (
              <div className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">
                All done for today.
              </div>
            )}
          </div>
        </Surface>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: "Present",
                value: presentCount,
                icon: CheckCircle2,
                className: "bg-emerald-50 text-emerald-700",
              },
              {
                label: "Late",
                value: lateCount,
                icon: Clock3,
                className: "bg-amber-50 text-amber-700",
              },
              {
                label: "Absent",
                value: absentCount,
                icon: MinusCircle,
                className: "bg-rose-50 text-rose-700",
              },
              {
                label: "Half day",
                value: halfDayCount,
                icon: TimerReset,
                className: "bg-sky-50 text-sky-700",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Surface key={item.label} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      {item.label}
                    </p>
                    <span className={`rounded-lg p-1.5 ${item.className}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {item.value}
                  </p>
                </Surface>
              );
            })}
          </div>

          <Surface className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Today&apos;s movement
              </h2>
              <Clock3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {todaysRows.slice(0, 6).map((record) => {
                const meta = statusMeta(record.status);
                return (
                  <div key={record.id} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-foreground" />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {record.employeeName}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatTime(record.checkInAt)}
                    </span>
                  </div>
                );
              })}
              {!todaysRows.length && (
                <div className="rounded-lg border border-dashed border-border p-5 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No records yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Check-ins will appear here as the day starts.
                  </p>
                </div>
              )}
            </div>
          </Surface>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Attendance ledger
            </h2>
            <p className="text-sm text-muted-foreground">
              Complete history of all attendance records.
            </p>
          </div>
          {correctionModal}
        </div>
        <DataTable
          headers={[
            "Employee",
            "Date",
            "Status",
          ]}
          empty="No attendance records yet."
          rows={attendanceRows.map((record) => {
            const meta = statusMeta(record.status);
            return [
              <div key="employee">
                <p className="font-medium text-foreground">
                  {record.employeeName}
                </p>
                <p className="text-xs text-muted-foreground">Attendance record</p>
              </div>,
              <span key="date" className="font-mono text-xs text-muted-foreground">
                {record.attendanceDate}
              </span>,
              <span
                key="status"
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.className}`}
              >
                {meta.label}
              </span>,
            ];
          })}
        />
        <Pagination {...pagination} />
      </div>
    </div>
  );
}
