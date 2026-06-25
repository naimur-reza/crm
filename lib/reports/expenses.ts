import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { expenseItems, expenseCategories, expenseClaims } from "@/lib/db/schema";
import type { ReportResult } from "./types";

export async function getExpenseReport(): Promise<ReportResult> {
  const db = getDb();

  const [byCategory, summary] = await Promise.all([
    db
      .select({
        categoryName: expenseCategories.name,
        categoryType: expenseCategories.type,
        count: sql<number>`count(${expenseItems.id})::int`,
        totalAmount: sql<number>`coalesce(sum(${expenseItems.amountCents}), 0)::int`,
      })
      .from(expenseCategories)
      .leftJoin(expenseItems, sql`${expenseItems.categoryId} = ${expenseCategories.id}`)
      .groupBy(expenseCategories.name, expenseCategories.type)
      .orderBy(sql`coalesce(sum(${expenseItems.amountCents}), 0) desc`),
    db
      .select({
        totalClaimed: sql<number>`coalesce(sum(${expenseClaims.totalAmountCents}), 0)::int`,
        totalApproved: sql<number>`coalesce(sum(case when ${expenseClaims.status} = 'approved' then ${expenseClaims.totalAmountCents} else 0 end), 0)::int`,
        totalReimbursed: sql<number>`coalesce(sum(case when ${expenseClaims.status} = 'reimbursed' then ${expenseClaims.totalAmountCents} else 0 end), 0)::int`,
        claimCount: sql<number>`count(*)::int`,
      })
      .from(expenseClaims),
  ]);

  const summaryRow = summary[0] ?? { totalClaimed: 0, totalApproved: 0, totalReimbursed: 0, claimCount: 0 };
  const pending = summaryRow.totalClaimed - summaryRow.totalApproved;

  return {
    title: "Expense by Category",
    description: "Expense claims summarized by category with approval and reimbursement status.",
    summaryCards: [
      { label: "Total Claimed", value: `$${(summaryRow.totalClaimed / 100).toLocaleString()}`, tone: "blue" },
      { label: "Approved", value: `$${(summaryRow.totalApproved / 100).toLocaleString()}`, tone: "green" },
      { label: "Reimbursed", value: `$${(summaryRow.totalReimbursed / 100).toLocaleString()}`, tone: "green" },
      { label: "Pending Approval", value: `$${(pending / 100).toLocaleString()}`, tone: pending > 0 ? "amber" : "green" },
      { label: "Claims", value: summaryRow.claimCount, tone: "purple" },
    ],
    columns: [
      { key: "categoryName", label: "Category" },
      { key: "categoryType", label: "Type" },
      { key: "count", label: "Items", format: "number" },
      { key: "totalAmount", label: "Total", format: "currency" },
    ],
    rows: byCategory.map((r) => ({ ...r })),
    chartData: byCategory.map((r) => ({
      name: r.categoryName,
      value: r.totalAmount,
    })),
    chartType: "pie",
  };
}
