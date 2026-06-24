import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { canAccess } from "@/lib/auth/permissions";
import { buildPagination, getPaginationParams } from "@/lib/pagination";
import { expenseClaims, employees, users } from "@/lib/db/schema";
import { ExpensesClient } from "./expenses-client";

export default async function ExpensesPage(props: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "expenses")) redirect("/dashboard");

  const sp = await props.searchParams;
  const { page, pageSize, offset } = getPaginationParams(sp);
  const tab = sp.tab === "pending" ? "pending" : (sp.tab === "all" ? "all" : "my");
  const isAdmin = canAccess(user, "expenses") && !user.roles.includes("employee");

  const [employee] = await getDb()
    .select({ id: employees.id, fullName: employees.fullName })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  const employeeId = employee?.id;

  const baseConditions: ReturnType<typeof eq>[] = [];
  if (tab === "my" && employeeId) {
    baseConditions.push(eq(expenseClaims.employeeId, employeeId));
  } else if (tab === "pending") {
    baseConditions.push(eq(expenseClaims.status, "pending"));
  }
  const whereClause = baseConditions.length > 0 ? and(...baseConditions) : undefined;

  const [countResult, claims] = await Promise.all([
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(expenseClaims)
      .where(whereClause)
      .then((r) => r[0]),
    getDb()
      .select({
        id: expenseClaims.id,
        claimNumber: expenseClaims.claimNumber,
        title: expenseClaims.title,
        totalAmountCents: expenseClaims.totalAmountCents,
        status: expenseClaims.status,
        employeeId: expenseClaims.employeeId,
        employeeName: employees.fullName,
        submittedAt: expenseClaims.submittedAt,
        reviewedBy: expenseClaims.reviewedBy,
        reviewerName: users.name,
        reviewedAt: expenseClaims.reviewedAt,
        createdAt: expenseClaims.createdAt,
      })
      .from(expenseClaims)
      .leftJoin(employees, eq(expenseClaims.employeeId, employees.id))
      .leftJoin(users, eq(expenseClaims.reviewedBy, users.id))
      .where(whereClause)
      .orderBy(desc(expenseClaims.createdAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const pagination = buildPagination(page, pageSize, countResult.count);
  const canSubmit = employee !== undefined;

  return (
    <ExpensesClient
      claims={claims}
      currentEmployeeId={employee?.id ?? null}
      currentEmployeeName={employee?.fullName ?? user.name}
      isAdmin={isAdmin}
      canSubmit={canSubmit}
      tab={tab as "my" | "pending" | "all"}
      pagination={pagination}
    />
  );
}
