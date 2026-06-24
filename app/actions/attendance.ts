"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceRecords, employees, siteSettings } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { attendanceCorrectionSchema } from "@/lib/validation/attendance";
import { getLocalMinutes, today } from "@/lib/time";

async function getLateCutoff() {
  let settings = await getDb().select().from(siteSettings).limit(1);
  if (settings.length === 0) {
    const [created] = await getDb().insert(siteSettings).values({}).returning();
    settings = [created];
  }
  const s = settings[0];
  const [h, m] = (s.officeStartTime || "10:00").split(":").map(Number);
  const startMinutes = h * 60 + m;
  const cutoffMinutes = startMinutes + (s.gracePeriodMinutes ?? 40);
  return cutoffMinutes;
}

export async function checkIn() {
  const user = await requireUser();
  requirePermission(user, "attendance");

  const [employee] = await getDb()
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  if (!employee) {
    throw new Error("Your user account is not linked to an employee profile.");
  }

  const cutoffMinutes = await getLateCutoff();
  const now = new Date();
  const currentMinutes = getLocalMinutes();
  const isLate = currentMinutes > cutoffMinutes;

  await getDb()
    .insert(attendanceRecords)
    .values({
      employeeId: employee.id,
      attendanceDate: today(),
      checkInAt: now,
      status: isLate ? "late" : "present",
      source: "manual",
    })
    .onConflictDoUpdate({
      target: [attendanceRecords.employeeId, attendanceRecords.attendanceDate],
      set: { checkInAt: now, updatedAt: new Date() },
    });

  await logAudit(user.id, "attendance.checked_in", "employee", employee.id);
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
}

export async function checkOut() {
  const user = await requireUser();
  requirePermission(user, "attendance");

  const [employee] = await getDb()
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  if (!employee) {
    throw new Error("Your user account is not linked to an employee profile.");
  }

  const result = await getDb()
    .update(attendanceRecords)
    .set({ checkOutAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        eq(attendanceRecords.attendanceDate, today()),
      ),
    );

  if (result.rowCount === 0) {
    throw new Error("No check-in record found for today. Please check in first.");
  }

  await logAudit(user.id, "attendance.checked_out", "employee", employee.id);
  revalidatePath("/attendance");
}

export async function correctAttendance(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "attendance");

  const parsed = attendanceCorrectionSchema.parse({
    employeeId: formData.get("employeeId"),
    attendanceDate: formData.get("attendanceDate"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });

  const [record] = await getDb()
    .insert(attendanceRecords)
    .values({
      employeeId: parsed.employeeId,
      attendanceDate: parsed.attendanceDate,
      status: parsed.status,
      source: "admin",
      notes: parsed.notes,
      correctedByUserId: user.id,
      correctedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [attendanceRecords.employeeId, attendanceRecords.attendanceDate],
      set: {
        status: parsed.status,
        notes: parsed.notes,
        source: "admin",
        correctedByUserId: user.id,
        correctedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning({ id: attendanceRecords.id });

  await logAudit(user.id, "attendance.corrected", "attendance_record", record.id);
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
}
