"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canAccess, requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  employees,
  leaveBalances,
  leaveRequests,
  notifications,
  roles,
  userRoles,
  users,
} from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { leaveRequestSchema, leaveReviewSchema } from "@/lib/validation/leaves";

export async function submitLeaveRequest(formData: FormData) {
  const user = await requireUser();

  const parsed = leaveRequestSchema.parse({
    employeeId: formData.get("employeeId"),
    leaveType: formData.get("leaveType"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason"),
  });

  const [employee] = await getDb()
    .select({ userId: employees.userId })
    .from(employees)
    .where(eq(employees.id, parsed.employeeId))
    .limit(1);

  if (!employee || employee.userId !== user.id) {
    throw new Error("You can only submit leave requests for yourself.");
  }

  if (new Date(parsed.startDate) > new Date(parsed.endDate)) {
    throw new Error("Start date must be on or before end date.");
  }

  const [leave] = await getDb()
    .insert(leaveRequests)
    .values({
      employeeId: parsed.employeeId,
      leaveType: parsed.leaveType,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      reason: parsed.reason,
    })
    .returning({ id: leaveRequests.id });

  await logAudit(user.id, "leave.created", "leave", leave.id);

  // Notify all admin and hr users
  const adminRoleRows = await getDb()
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.name, ["admin", "hr"]));

  if (adminRoleRows.length > 0) {
    const adminUserIds = await getDb()
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(inArray(userRoles.roleId, adminRoleRows.map((r) => r.id)));

    const uniqueUserIds = [...new Set(adminUserIds.map((r) => r.userId))].filter(
      (id) => id !== user.id,
    );

    for (const uid of uniqueUserIds) {
      await getDb().insert(notifications).values({
        userId: uid,
        type: "leave_request",
        title: "Leave Request",
        body: `${user.name} requested ${parsed.leaveType} leave (${parsed.startDate} - ${parsed.endDate})`,
        actorUserId: user.id,
      });
    }
  }

  revalidatePath("/leaves");
}

export async function approveLeaveRequest(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "leaves");

  const parsed = leaveReviewSchema.parse({
    id: formData.get("id"),
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") || undefined,
  });

  const [leave] = await getDb()
    .select({
      id: leaveRequests.id,
      employeeId: leaveRequests.employeeId,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .where(eq(leaveRequests.id, parsed.id))
    .limit(1);

  if (!leave) throw new Error("Leave request not found.");
  if (leave.status !== "pending") throw new Error("Only pending requests can be reviewed.");

  await getDb()
    .update(leaveRequests)
    .set({
      status: parsed.status,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      adminNotes: parsed.adminNotes || null,
    })
    .where(eq(leaveRequests.id, parsed.id));

  await logAudit(user.id, `leave.${parsed.status}`, "leave", parsed.id);

  // If approved, update leave balance
  if (parsed.status === "approved") {
    const year = new Date().getFullYear();
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const existing = await getDb()
      .select({ id: leaveBalances.id })
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.employeeId, leave.employeeId),
          eq(leaveBalances.year, year),
          eq(leaveBalances.leaveType, leave.leaveType),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await getDb()
        .update(leaveBalances)
        .set({ usedDays: sql`${leaveBalances.usedDays} + ${days}` })
        .where(eq(leaveBalances.id, existing[0].id));
    }
  }

  // Notify the employee
  const [employee] = await getDb()
    .select({ userId: employees.userId, fullName: employees.fullName })
    .from(employees)
    .where(eq(employees.id, leave.employeeId))
    .limit(1);

  if (employee?.userId) {
    await getDb().insert(notifications).values({
      userId: employee.userId,
      type: "leave_review",
      title: `Leave ${parsed.status}`,
      body: `Your ${leave.leaveType} leave (${leave.startDate} - ${leave.endDate}) has been ${parsed.status}.${parsed.adminNotes ? ` Note: ${parsed.adminNotes}` : ""}`,
      actorUserId: user.id,
    });
  }

  revalidatePath("/leaves");
}

export async function cancelLeaveRequest(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("Leave request ID required.");

  const [leave] = await getDb()
    .select({
      id: leaveRequests.id,
      employeeId: leaveRequests.employeeId,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .where(eq(leaveRequests.id, id))
    .limit(1);

  if (!leave) throw new Error("Leave request not found.");
  if (leave.status !== "pending") throw new Error("Only pending requests can be cancelled.");

  const [employee] = await getDb()
    .select({ userId: employees.userId })
    .from(employees)
    .where(eq(employees.id, leave.employeeId))
    .limit(1);

  if (!employee || employee.userId !== user.id) {
    throw new Error("You can only cancel your own leave requests.");
  }

  await getDb()
    .update(leaveRequests)
    .set({ status: "cancelled" })
    .where(eq(leaveRequests.id, id));

  await logAudit(user.id, "leave.cancelled", "leave", id);
  revalidatePath("/leaves");
}

export async function getLeaveRequests() {
  const user = await requireUser();
  const isAdmin = canAccess(user, "leaves");

  const [employee] = await getDb()
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  const query = getDb()
    .select({
      id: leaveRequests.id,
      employeeId: leaveRequests.employeeId,
      employeeName: employees.fullName,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      adminNotes: leaveRequests.adminNotes,
      reviewedBy: leaveRequests.reviewedBy,
      reviewerName: users.name,
      reviewedAt: leaveRequests.reviewedAt,
      createdAt: leaveRequests.createdAt,
    })
    .from(leaveRequests)
    .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .leftJoin(users, eq(leaveRequests.reviewedBy, users.id))
    .orderBy(desc(leaveRequests.createdAt));

  if (!isAdmin && employee) {
    query.where(eq(leaveRequests.employeeId, employee.id));
  }

  return await query;
}

export async function getLeaveBalances() {
  const user = await requireUser();

  const [employee] = await getDb()
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  if (!employee) return [];

  const year = new Date().getFullYear();

  return await getDb()
    .select()
    .from(leaveBalances)
    .where(and(eq(leaveBalances.employeeId, employee.id), eq(leaveBalances.year, year)));
}
