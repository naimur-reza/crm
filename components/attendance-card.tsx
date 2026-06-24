"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, LogIn, LogOut } from "lucide-react";
import { checkIn, checkOut } from "@/app/actions/attendance";
import Image from "next/image";

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")} : ${String(m).padStart(2, "0")} : ${String(sec).padStart(2, "0")}`;
}

export function AttendanceCard({
  checkedIn,
  checkedOut,
  checkInAt,
  checkOutAt,
}: {
  checkedIn: boolean;
  checkedOut: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!checkedIn || checkedOut) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [checkedIn, checkedOut]);

  const workingSeconds = useMemo(() => {
    if (!checkInAt) return 0;
    const start = new Date(checkInAt).getTime();
    const end = checkOutAt ? new Date(checkOutAt).getTime() : now;
    return (end - start) / 1000;
  }, [checkInAt, checkOutAt, now]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-50">
        <Image src="/tree2.jpg" alt="" fill className="object-contain" />
      </div>

      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Working Hours
        </p>
        <p className="text-lg font-bold tabular-nums tracking-tight text-slate-800">
          {formatDuration(workingSeconds)}
        </p>
      </div>

      {!checkedIn ? (
        <form action={checkIn}>
          <button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg active:scale-[0.98]">
            <LogIn className="h-4 w-4" />
            Check In
          </button>
        </form>
      ) : !checkedOut ? (
        <form action={checkOut}>
          <button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-sky-200 transition hover:from-sky-400 hover:to-cyan-400 hover:shadow-lg active:scale-[0.98]">
            <LogOut className="h-4 w-4" />
            Check Out
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
          <BadgeCheck className="h-4 w-4" />
          Completed for today
        </div>
      )}
    </div>
  );
}
