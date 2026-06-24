import "server-only";

const TIMEZONE = "Asia/Dhaka";

export function today(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function formatTime(value: Date | null): string {
  if (!value) return "-";
  return value.toLocaleTimeString("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatTime12(value: Date | null): string {
  if (!value) return "-";
  return value.toLocaleTimeString("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function monthStart(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  const localParts = formatter.formatToParts(now);
  const year = localParts.find((p) => p.type === "year")!.value;
  const month = localParts.find((p) => p.type === "month")!.value;
  return `${year}-${month}-01`;
}

export function getLocalYear(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
  });
  return parseInt(formatter.format(new Date()));
}

export function getLocalMonth(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    month: "numeric",
  });
  return parseInt(formatter.format(new Date()));
}

export function getLocalMonthName(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: TIMEZONE,
    month: "long",
  });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getLocalMinutes(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [h, m] = formatter.format(new Date()).split(":").map(Number);
  return h * 60 + m;
}

/** Recompute attendance status from a UTC timestamp + site settings. */
export function computeStatus(
  checkInAt: Date | null,
  officeStartTime: string,
  gracePeriodMinutes: number,
): "present" | "late" | null {
  if (!checkInAt) return null;
  const [h, m] = officeStartTime.split(":").map(Number);
  const cutoff = h * 60 + m + gracePeriodMinutes;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [dhH, dhM] = formatter.format(checkInAt).split(":").map(Number);
  return dhH * 60 + dhM > cutoff ? "late" : "present";
}

export function getMonthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
