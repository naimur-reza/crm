"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { updateLateCutoff } from "@/app/actions/settings";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AttendanceSettingsForm({
  officeStartTime,
  gracePeriodMinutes,
}: {
  officeStartTime: string;
  gracePeriodMinutes: number;
}) {
  const [startTime, setStartTime] = useState(officeStartTime);
  const [grace, setGrace] = useState(gracePeriodMinutes);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("officeStartTime", startTime);
    fd.set("gracePeriodMinutes", String(grace));
    await updateLateCutoff(fd);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600" />
        <h2 className="text-sm font-semibold text-foreground">Late Attendance</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="officeStartTime" className="text-xs">Office Start Time</Label>
          <input
            id="officeStartTime"
            name="officeStartTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-9 w-32 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="gracePeriodMinutes" className="text-xs">Grace Period (min)</Label>
          <input
            id="gracePeriodMinutes"
            name="gracePeriodMinutes"
            type="number"
            min={0}
            max={240}
            value={grace}
            onChange={(e) => setGrace(Number(e.target.value))}
            className="h-9 w-24 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            required
          />
        </div>
        <Button type="submit" size="sm">
          {saved ? "Saved" : "Save"}
        </Button>
      </form>
    </div>
  );
}
