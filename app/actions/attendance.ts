"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { attendanceRecords, employees } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { attendanceCorrectionSchema } from "@/lib/validation/attendance";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function checkIn() {
  const user = await requireUser();
  requirePermission(user.roles, "attendance");

  const [employee] = await getDb()
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  if (!employee) {
    throw new Error("Your user account is not linked to an employee profile.");
  }

  await getDb()
    .insert(attendanceRecords)
    .values({
      employeeId: employee.id,
      attendanceDate: today(),
      checkInAt: new Date(),
      status: "present",
      source: "manual",
    })
    .onConflictDoUpdate({
      target: [attendanceRecords.employeeId, attendanceRecords.attendanceDate],
      set: { checkInAt: new Date(), updatedAt: new Date() },
    });

  await logAudit(user.id, "attendance.checked_in", "employee", employee.id);
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
}

export async function checkOut() {
  const user = await requireUser();
  requirePermission(user.roles, "attendance");

  const [employee] = await getDb()
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  if (!employee) {
    throw new Error("Your user account is not linked to an employee profile.");
  }

  await getDb()
    .update(attendanceRecords)
    .set({ checkOutAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        eq(attendanceRecords.attendanceDate, today()),
      ),
    );

  await logAudit(user.id, "attendance.checked_out", "employee", employee.id);
  revalidatePath("/attendance");
}

export async function correctAttendance(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "attendance");

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
