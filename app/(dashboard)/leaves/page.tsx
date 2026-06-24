import { redirect } from "next/navigation";
import { desc, eq, and, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { canAccess } from "@/lib/auth/permissions";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import {
  employees,
  leaveBalances,
  leaveRequests,
  users,
} from "@/lib/db/schema";
import { LeavesClient } from "./leaves-client";

export default async function LeavesPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "leaves") && !user.roles.includes("employee")) redirect("/dashboard");

  const sp = await props.searchParams;
  const { page, pageSize, offset } = getPaginationParams(sp);
  const tab = sp.tab === "pending" ? "pending" : "my";
  const isAdmin = canAccess(user, "leaves");

  const [employee] = await getDb()
    .select({ id: employees.id, fullName: employees.fullName })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  const year = new Date().getFullYear();
  const employeeId = employee?.id;

  const baseConditions: ReturnType<typeof eq>[] = [];
  if (tab === "my" && employeeId) {
    baseConditions.push(eq(leaveRequests.employeeId, employeeId));
  } else if (tab === "pending") {
    baseConditions.push(eq(leaveRequests.status, "pending"));
  }
  const whereClause = baseConditions.length > 0 ? and(...baseConditions) : undefined;

  const [countResult, requests, balances] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(whereClause)
      .then((r) => r[0]),
    getDb()
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
        reviewerName: users.name,
        reviewedAt: leaveRequests.reviewedAt,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .leftJoin(users, eq(leaveRequests.reviewedBy, users.id))
      .where(whereClause)
      .orderBy(desc(leaveRequests.createdAt))
      .limit(pageSize)
      .offset(offset),
    employeeId
      ? getDb()
          .select()
          .from(leaveBalances)
          .where(
            and(
              eq(leaveBalances.employeeId, employeeId),
              eq(leaveBalances.year, year),
            ),
          )
      : Promise.resolve([]),
  ]);

  const pagination = buildPagination(page, pageSize, countResult.count);
  const canSubmit = employee !== undefined;

  return (
    <LeavesClient
      requests={requests}
      balances={balances}
      currentEmployeeId={employee?.id ?? null}
      currentEmployeeName={employee?.fullName ?? user.name}
      isAdmin={isAdmin}
      canSubmit={canSubmit}
      year={year}
      tab={tab}
      pagination={pagination}
    />
  );
}
