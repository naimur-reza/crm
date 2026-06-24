import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  employees,
  expenseCategories,
  expenseClaims,
  expenseItems,
  expenseReimbursements,
  expenseToInvoiceLinks,
  users,
} from "@/lib/db/schema";

export async function getExpenseClaimList(filters?: {
  employeeId?: string;
  status?: string;
}) {
  const conditions = [];
  if (filters?.employeeId) {
    conditions.push(eq(expenseClaims.employeeId, filters.employeeId));
  }
  if (filters?.status) {
    conditions.push(eq(expenseClaims.status, filters.status as "draft" | "pending" | "approved" | "rejected" | "reimbursed"));
  }

  return getDb()
    .select({
      id: expenseClaims.id,
      claimNumber: expenseClaims.claimNumber,
      title: expenseClaims.title,
      totalAmountCents: expenseClaims.totalAmountCents,
      status: expenseClaims.status,
      employeeId: expenseClaims.employeeId,
      employeeName: employees.fullName,
      submittedAt: expenseClaims.submittedAt,
      createdAt: expenseClaims.createdAt,
      reviewedBy: expenseClaims.reviewedBy,
    })
    .from(expenseClaims)
    .leftJoin(employees, eq(expenseClaims.employeeId, employees.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expenseClaims.createdAt));
}

export async function getExpenseClaimDetail(claimId: string) {
  const [claimRows, items, reimbursements, invoiceLinks] = await Promise.all([
    getDb()
      .select({
        id: expenseClaims.id,
        claimNumber: expenseClaims.claimNumber,
        title: expenseClaims.title,
        description: expenseClaims.description,
        totalAmountCents: expenseClaims.totalAmountCents,
        status: expenseClaims.status,
        employeeId: expenseClaims.employeeId,
        employeeName: employees.fullName,
        submittedAt: expenseClaims.submittedAt,
        reviewedBy: expenseClaims.reviewedBy,
        reviewerName: users.name,
        reviewedAt: expenseClaims.reviewedAt,
        adminNotes: expenseClaims.adminNotes,
        reimbursedAt: expenseClaims.reimbursedAt,
        createdAt: expenseClaims.createdAt,
        updatedAt: expenseClaims.updatedAt,
      })
      .from(expenseClaims)
      .leftJoin(employees, eq(expenseClaims.employeeId, employees.id))
      .leftJoin(users, eq(expenseClaims.reviewedBy, users.id))
      .where(eq(expenseClaims.id, claimId))
      .limit(1),
    getDb()
      .select({
        id: expenseItems.id,
        categoryId: expenseItems.categoryId,
        categoryName: expenseCategories.name,
        categoryType: expenseCategories.type,
        description: expenseItems.description,
        amountCents: expenseItems.amountCents,
        expenseDate: expenseItems.expenseDate,
        receiptUrl: expenseItems.receiptUrl,
        notes: expenseItems.notes,
        createdAt: expenseItems.createdAt,
      })
      .from(expenseItems)
      .leftJoin(expenseCategories, eq(expenseItems.categoryId, expenseCategories.id))
      .where(eq(expenseItems.claimId, claimId))
      .orderBy(desc(expenseItems.createdAt)),
    getDb()
      .select()
      .from(expenseReimbursements)
      .where(eq(expenseReimbursements.claimId, claimId))
      .orderBy(desc(expenseReimbursements.createdAt)),
    getDb()
      .select({
        id: expenseToInvoiceLinks.id,
        invoiceId: expenseToInvoiceLinks.invoiceId,
        amountCents: expenseToInvoiceLinks.amountCents,
        createdAt: expenseToInvoiceLinks.createdAt,
      })
      .from(expenseToInvoiceLinks)
      .where(eq(expenseToInvoiceLinks.expenseClaimId, claimId))
      .orderBy(desc(expenseToInvoiceLinks.createdAt)),
  ]);

  return {
    claim: claimRows[0],
    items,
    reimbursements,
    invoiceLinks,
  };
}

export async function getExpenseCategories() {
  return getDb()
    .select()
    .from(expenseCategories)
    .orderBy(expenseCategories.name);
}

export async function getActiveExpenseCategories() {
  return getDb()
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.isActive, true))
    .orderBy(expenseCategories.name);
}

export async function generateClaimNumber(): Promise<string> {
  const now = new Date();
  const prefix = `EXP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(expenseClaims)
    .where(sql`claim_number LIKE ${prefix + "%"}`);
  return `${prefix}${String((row?.count ?? 0) + 1).padStart(4, "0")}`;
}
