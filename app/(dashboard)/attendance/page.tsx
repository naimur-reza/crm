import { redirect } from "next/navigation";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { AnalogClock } from "@/components/analog-clock";
import { AttendanceCard } from "@/components/attendance-card";
import { MonthCalendar } from "@/components/month-calendar";
import { Surface } from "@/components/page-header";
import { canAccess } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceRecords, employees, siteSettings } from "@/lib/db/schema";
import {
  CalendarDays,
  Clock3,
  Percent,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import {
  computeStatus,
  formatTime12,
  getLocalMonthName,
  getLocalYear,
  monthStart,
  today,
} from "@/lib/time";

function statusMeta(status: string) {
  const map = {
    present: {
      label: "Present",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      dot: "bg-emerald-400",
    },
    late: {
      label: "Late",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      dot: "bg-amber-400",
    },
    absent: {
      label: "Absent",
      className: "bg-rose-50 text-rose-700 ring-rose-200",
      dot: "bg-rose-400",
    },
    half_day: {
      label: "Half day",
      className: "bg-sky-50 text-sky-700 ring-sky-200",
      dot: "bg-sky-400",
    },
  } as const;

  return map[status as keyof typeof map] ?? map.present;
}

function InsightCard({
  title,
  value,
  detail,
  tone,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "emerald" | "amber" | "rose" | "cyan";
  icon: React.ReactNode;
}) {
  const tones = {
    emerald: {
      text: "text-emerald-700",
      soft: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      fillStart: "#86efac",
      fillEnd: "#ecfdf5",
      stroke: "stroke-emerald-400",
    },
    amber: {
      text: "text-amber-700",
      soft: "bg-amber-50 text-amber-700 ring-amber-100",
      fillStart: "#fdba74",
      fillEnd: "#fff7ed",
      stroke: "stroke-orange-400",
    },
    rose: {
      text: "text-rose-700",
      soft: "bg-rose-50 text-rose-700 ring-rose-100",
      fillStart: "#fda4af",
      fillEnd: "#fff1f2",
      stroke: "stroke-rose-400",
    },
    cyan: {
      text: "text-cyan-700",
      soft: "bg-cyan-50 text-cyan-700 ring-cyan-100",
      fillStart: "#67e8f9",
      fillEnd: "#ecfeff",
      stroke: "stroke-cyan-400",
    },
  } as const;
  const t = tones[tone];

  return (
    <Surface className="group relative min-h-36 overflow-hidden border-sky-100 bg-white/90 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] hover:shadow-[0_18px_48px_rgba(31,92,132,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {title}
          </p>
          <p className={`mt-4 text-4xl font-bold leading-none ${t.text}`}>
            {value}
          </p>
          <p className="mt-3 text-xs font-medium text-slate-400">{detail}</p>
        </div>
        <span className={`rounded-xl p-2 ring-1 ${t.soft}`}>{icon}</span>
      </div>
      <svg
        viewBox="0 0 180 80"
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-24 w-40 opacity-90 transition duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id={`metric-${tone}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={t.fillStart} stopOpacity="0.78" />
            <stop offset="100%" stopColor={t.fillEnd} stopOpacity="0.92" />
          </linearGradient>
        </defs>
        <path
          d="M0 62 C18 58 21 34 38 35 C52 36 54 56 70 48 C86 40 82 14 101 12 C120 10 120 45 137 40 C153 35 153 22 168 25 C174 27 178 29 180 29 L180 80 L0 80 Z"
          fill={`url(#metric-${tone})`}
        />
        <path
          d="M0 62 C18 58 21 34 38 35 C52 36 54 56 70 48 C86 40 82 14 101 12 C120 10 120 45 137 40 C153 35 153 22 168 25 C174 27 178 29 180 29"
          className={t.stroke}
          fill="none"
          strokeWidth="2"
        />
      </svg>
    </Surface>
  );
}

export default async function AttendancePage() {
  const user = await requireUser();
  if (!canAccess(user, "attendance")) redirect("/dashboard");

  const todayStr = today();
  const monthStartStr = monthStart();
  const year = getLocalYear();

  const [currentEmployee, todaysRows, siteCfg] = await Promise.all([
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
          eq(attendanceRecords.attendanceDate, todayStr),
        ),
      )
      .where(eq(employees.userId, user.id))
      .limit(1)
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
      .where(eq(attendanceRecords.attendanceDate, todayStr))
      .orderBy(desc(attendanceRecords.checkInAt)),
    getDb().select().from(siteSettings).limit(1).then((r) => r[0] ?? {}),
  ]);

  const monthlyRows = currentEmployee
    ? await getDb()
        .select({
          attendanceDate: attendanceRecords.attendanceDate,
          status: attendanceRecords.status,
          checkInAt: attendanceRecords.checkInAt,
        })
        .from(attendanceRecords)
        .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .where(
          and(
            eq(employees.userId, user.id),
            gte(attendanceRecords.attendanceDate, monthStartStr),
            lte(attendanceRecords.attendanceDate, todayStr),
          ),
        )
        .then((rows) =>
          rows.map((r) => ({
            ...r,
            status:
              computeStatus(
                r.checkInAt,
                siteCfg.officeStartTime ?? "10:00",
                siteCfg.gracePeriodMinutes ?? 40,
              ) ?? r.status,
          })),
        )
    : [];

  const totalMonth = monthlyRows.length || 1;
  const onTimeCount = monthlyRows.filter((r) => r.status === "present").length;
  const lateCount = monthlyRows.filter((r) => r.status === "late").length;
  const absentCount = monthlyRows.filter((r) => r.status === "absent").length;
  const halfDayCount = monthlyRows.filter(
    (r) => r.status === "half_day",
  ).length;

  const onTimePct = Math.round((onTimeCount / totalMonth) * 100);
  const latePct = Math.round((lateCount / totalMonth) * 100);
  const absentPct = Math.round((absentCount / totalMonth) * 100);

  const checkedIn = !!currentEmployee?.checkInAt;
  const checkedOut = !!currentEmployee?.checkOutAt;
  const monthName = getLocalMonthName();

  return (
    <div className="-m-4 grid gap-6 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.30),transparent_34%),linear-gradient(180deg,#eef7fc_0%,#f8fbfd_46%,#ffffff_100%)] p-4 sm:-m-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Insights
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
            Attendance
          </h1>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="flex h-9 flex-1 items-center justify-center rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm sm:flex-none">
            {year}
          </div>
          <div className="flex h-9 flex-1 items-center justify-center rounded-lg border border-sky-200 bg-white/80 px-4 text-xs font-semibold text-sky-700 shadow-sm sm:flex-none">
            {monthName}
          </div>
        </div>
      </div>

      {currentEmployee ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InsightCard
              title="On Time Percentage"
              value={`${onTimePct}%`}
              detail={`${onTimeCount} days this month`}
              tone="emerald"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <InsightCard
              title="Late Percentage"
              value={`${latePct}%`}
              detail={`${lateCount} days this month`}
              tone="amber"
              icon={<Clock3 className="h-4 w-4" />}
            />
            <InsightCard
              title="Absent Percentage"
              value={`${absentPct}%`}
              detail={`${absentCount} days this month`}
              tone="rose"
              icon={<Percent className="h-4 w-4" />}
            />
            <InsightCard
              title="Half Day"
              value={`${halfDayCount}`}
              detail="days this month"
              tone="cyan"
              icon={<TimerReset className="h-4 w-4" />}
            />
          </div>

          <div>
            <h2 className="mb-3 text-base font-bold text-slate-700">
              Attendance
            </h2>
            <div className="grid gap-4 xl:grid-cols-[0.85fr_2fr]">
              <Surface className="border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
                <MonthCalendar records={monthlyRows} />
              </Surface>

              <Surface className="grid gap-5 border-sky-100 bg-white/95 p-5 shadow-[0_14px_40px_rgba(31,92,132,0.10)] lg:grid-cols-[1fr_1.35fr]">
                <div className="flex min-h-44 items-center justify-center">
                  <AnalogClock />
                </div>
                <AttendanceCard
                  checkedIn={checkedIn}
                  checkedOut={checkedOut}
                  checkInAt={currentEmployee?.checkInAt?.toISOString() ?? null}
                  checkOutAt={
                    currentEmployee?.checkOutAt?.toISOString() ?? null
                  }
                />
              </Surface>
            </div>
          </div>
        </>
      ) : (
        <Surface className="border-sky-100 bg-white/95 p-8 text-center shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
          <p className="text-sm font-semibold text-slate-700">
            No employee profile linked to your account.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Only employees can check in/out. You can still view today&apos;s
            movement below.
          </p>
        </Surface>
      )}

      <Surface className="overflow-hidden border-sky-100 bg-white/95 p-0 shadow-[0_14px_40px_rgba(31,92,132,0.10)]">
        <div className="border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                Live desk
              </p>
              <h2 className="mt-1 text-base font-black text-slate-800">
                Today&apos;s movement
              </h2>
            </div>
            <span className="rounded-lg bg-sky-50 p-2 text-sky-700 ring-1 ring-sky-100">
              <CalendarDays className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {todaysRows.slice(0, 6).map((record) => {
              const computed = computeStatus(
                record.checkInAt,
                siteCfg.officeStartTime ?? "10:00",
                siteCfg.gracePeriodMinutes ?? 40,
              );
              const m = statusMeta(computed ?? record.status);
              return (
                <div
                  key={record.id}
                  className="group flex items-center gap-3 rounded-2xl border border-sky-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fcff_100%)] p-3 shadow-[0_10px_24px_rgba(31,92,132,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(31,92,132,0.12)]"
                >
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sm font-black text-sky-800 ring-1 ring-sky-100">
                    {record.employeeName.charAt(0).toUpperCase()}
                    <span
                      className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white ${m.dot}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {record.employeeName}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      {formatTime12(record.checkInAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${m.className}`}
                  >
                    {m.label}
                  </span>
                </div>
              );
            })}
            {!todaysRows.length && (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-6 text-center md:col-span-2 xl:col-span-3">
                <p className="text-sm font-semibold text-slate-800">
                  No records yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Check-ins will appear here as the day starts.
                </p>
              </div>
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
}
