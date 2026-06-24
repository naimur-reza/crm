import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { canAccess } from "@/lib/auth/permissions";
import { getExpenseClaimDetail } from "@/lib/db/queries/expenses";
import { employees, invoices } from "@/lib/db/schema";
import { ClaimDetailClient } from "./claim-detail-client";

export default async function ExpenseClaimDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canAccess(user, "expenses")) redirect("/dashboard");

  const { id } = await props.params;
  const result = await getExpenseClaimDetail(id);

  if (!result.claim) notFound();

  const isAdmin = canAccess(user, "expenses") && !user.roles.includes("employee");

  const [employee] = await getDb()
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);

  const isOwner = employee?.id === result.claim.employeeId;

  if (!isAdmin && !isOwner) redirect("/expenses");

  const invoiceRows = await getDb()
    .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, totalCents: invoices.totalCents, status: invoices.status })
    .from(invoices)
    .orderBy(invoices.createdAt);

  return (
    <ClaimDetailClient
      claim={result.claim as any}
      items={result.items as any[]}
      reimbursements={result.reimbursements as any[]}
      invoiceLinks={result.invoiceLinks as any[]}
      invoices={invoiceRows}
      isAdmin={isAdmin}
      isOwner={isOwner}
      currentUserId={user.id}
    />
  );
}
