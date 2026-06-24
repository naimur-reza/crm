"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canAccess, requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  departments,
  employees,
  expenseCategories,
  expenseClaims,
  expenseItems,
  expenseReimbursements,
  expenseToInvoiceLinks,
  notifications,
  roles,
  userRoles,
  users,
} from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { generateClaimNumber, getExpenseClaimDetail } from "@/lib/db/queries/expenses";
import {
  expenseCategorySchema,
  expenseClaimSchema,
  expenseLinkInvoiceSchema,
  expenseReimburseSchema,
  expenseReviewSchema,
} from "@/lib/validation/expenses";
import { dollarsToCents } from "@/lib/crm/money";

export async function saveDraftExpenseClaim(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const employee = await getMyEmployee(user);
  if (!employee) throw new Error("Your user account is not linked to an employee profile.");

  const parsed = expenseClaimSchema.parse({
    employeeId: employee.id,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  const claimNumber = await generateClaimNumber();

  const [claim] = await getDb()
    .insert(expenseClaims)
    .values({
      claimNumber,
      employeeId: parsed.employeeId,
      title: parsed.title,
      description: parsed.description,
      status: "draft",
    })
    .returning({ id: expenseClaims.id });

  const itemsData = extractItemsFromForm(formData);
  if (itemsData.length > 0) {
    await getDb().insert(expenseItems).values(
      itemsData.map((item) => ({
        claimId: claim.id,
        categoryId: item.categoryId || null,
        description: item.description,
        amountCents: item.amountCents,
        expenseDate: item.expenseDate,
      })),
    );

    const totalCents = itemsData.reduce((sum, item) => sum + item.amountCents, 0);
    await getDb()
      .update(expenseClaims)
      .set({ totalAmountCents: totalCents })
      .where(eq(expenseClaims.id, claim.id));
  }

  await logAudit(user.id, "expense.draft_saved", "expense_claim", claim.id);
  revalidatePath("/expenses");
  return { id: claim.id };
}

export async function submitExpenseClaim(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const employee = await getMyEmployee(user);
  if (!employee) throw new Error("Your user account is not linked to an employee profile.");

  const parsed = expenseClaimSchema.parse({
    employeeId: employee.id,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  const claimNumber = await generateClaimNumber();

  const [claim] = await getDb()
    .insert(expenseClaims)
    .values({
      claimNumber,
      employeeId: parsed.employeeId,
      title: parsed.title,
      description: parsed.description,
      status: "pending",
      submittedAt: new Date(),
    })
    .returning({ id: expenseClaims.id });

  const itemsData = extractItemsFromForm(formData);
  if (itemsData.length === 0) throw new Error("At least one expense item is required.");

  await getDb().insert(expenseItems).values(
    itemsData.map((item) => ({
      claimId: claim.id,
      categoryId: item.categoryId || null,
      description: item.description,
      amountCents: item.amountCents,
      expenseDate: item.expenseDate,
    })),
  );

  const totalCents = itemsData.reduce((sum, item) => sum + item.amountCents, 0);
  await getDb()
    .update(expenseClaims)
    .set({ totalAmountCents: totalCents })
    .where(eq(expenseClaims.id, claim.id));

  await logAudit(user.id, "expense.submitted", "expense_claim", claim.id);

  // Notify admin, hr, and manager users
  const adminRoleRows = await getDb()
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.name, ["admin", "hr", "manager"]));

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
        type: "expense_submitted",
        title: "Expense Claim",
        body: `${user.name} submitted an expense claim: ${parsed.title} ($${(totalCents / 100).toFixed(2)})`,
        actorUserId: user.id,
      });
    }
  }

  revalidatePath("/expenses");
  return { id: claim.id };
}

export async function updateDraftExpenseClaim(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const claimId = formData.get("claimId");
  if (typeof claimId !== "string") throw new Error("Claim ID required.");

  const [claim] = await getDb()
    .select({ id: expenseClaims.id, employeeId: expenseClaims.employeeId, status: expenseClaims.status })
    .from(expenseClaims)
    .where(eq(expenseClaims.id, claimId))
    .limit(1);

  if (!claim) throw new Error("Claim not found.");
  if (claim.status !== "draft") throw new Error("Only draft claims can be edited.");

  const employee = await getMyEmployee(user);
  if (!employee || claim.employeeId !== employee.id) throw new Error("You can only edit your own drafts.");

  await getDb()
    .update(expenseClaims)
    .set({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
    })
    .where(eq(expenseClaims.id, claimId));

  // Remove existing items and re-insert
  const itemsData = extractItemsFromForm(formData);
  if (itemsData.length > 0) {
    await getDb().delete(expenseItems).where(eq(expenseItems.claimId, claimId));
    await getDb().insert(expenseItems).values(
      itemsData.map((item) => ({
        claimId,
        categoryId: item.categoryId || null,
        description: item.description,
        amountCents: item.amountCents,
        expenseDate: item.expenseDate,
      })),
    );

    const totalCents = itemsData.reduce((sum, item) => sum + item.amountCents, 0);
    await getDb()
      .update(expenseClaims)
      .set({ totalAmountCents: totalCents })
      .where(eq(expenseClaims.id, claimId));
  }

  revalidatePath("/expenses");
}

export async function approveExpenseClaim(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const parsed = expenseReviewSchema.parse({
    id: formData.get("id"),
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") || undefined,
  });

  const [claim] = await getDb()
    .select({ id: expenseClaims.id, status: expenseClaims.status, employeeId: expenseClaims.employeeId, title: expenseClaims.title, totalAmountCents: expenseClaims.totalAmountCents })
    .from(expenseClaims)
    .where(eq(expenseClaims.id, parsed.id))
    .limit(1);

  if (!claim) throw new Error("Expense claim not found.");
  if (claim.status !== "pending") throw new Error("Only pending claims can be reviewed.");

  await getDb()
    .update(expenseClaims)
    .set({
      status: parsed.status,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      adminNotes: parsed.adminNotes || null,
    })
    .where(eq(expenseClaims.id, parsed.id));

  await logAudit(user.id, `expense.${parsed.status}`, "expense_claim", parsed.id);

  // Notify the employee
  const [employee] = await getDb()
    .select({ userId: employees.userId, fullName: employees.fullName })
    .from(employees)
    .where(eq(employees.id, claim.employeeId))
    .limit(1);

  if (employee?.userId) {
    await getDb().insert(notifications).values({
      userId: employee.userId,
      type: "expense_review",
      title: `Expense ${parsed.status}`,
      body: `Your expense claim "${claim.title}" ($${(claim.totalAmountCents / 100).toFixed(2)}) has been ${parsed.status}.${parsed.adminNotes ? ` Note: ${parsed.adminNotes}` : ""}`,
      actorUserId: user.id,
    });
  }

  revalidatePath("/expenses");
}

export async function rejectExpenseClaim(formData: FormData) {
  formData.set("status", "rejected");
  return approveExpenseClaim(formData);
}

export async function markReimbursed(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const parsed = expenseReimburseSchema.parse({
    claimId: formData.get("claimId"),
    amountCents: dollarsToCents(formData.get("amount")),
    reimbursedDate: formData.get("reimbursedDate"),
    method: formData.get("method"),
    reference: formData.get("reference") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const [claim] = await getDb()
    .select({ id: expenseClaims.id, status: expenseClaims.status, employeeId: expenseClaims.employeeId, title: expenseClaims.title })
    .from(expenseClaims)
    .where(eq(expenseClaims.id, parsed.claimId))
    .limit(1);

  if (!claim) throw new Error("Expense claim not found.");
  if (claim.status !== "approved") throw new Error("Only approved claims can be reimbursed.");

  await getDb().insert(expenseReimbursements).values({
    claimId: parsed.claimId,
    amountCents: parsed.amountCents,
    reimbursedDate: parsed.reimbursedDate,
    method: parsed.method,
    reference: parsed.reference || null,
    notes: parsed.notes || null,
    processedBy: user.id,
  });

  await getDb()
    .update(expenseClaims)
    .set({ status: "reimbursed", reimbursedAt: new Date() })
    .where(eq(expenseClaims.id, parsed.claimId));

  await logAudit(user.id, "expense.reimbursed", "expense_claim", parsed.claimId);

  const [employee] = await getDb()
    .select({ userId: employees.userId })
    .from(employees)
    .where(eq(employees.id, claim.employeeId))
    .limit(1);

  if (employee?.userId) {
    await getDb().insert(notifications).values({
      userId: employee.userId,
      type: "expense_reimbursed",
      title: "Expense Reimbursed",
      body: `Your expense claim "${claim.title}" has been reimbursed.`,
      actorUserId: user.id,
    });
  }

  revalidatePath("/expenses");
}

export async function uploadReceipt(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const itemId = formData.get("itemId");
  if (typeof itemId !== "string") throw new Error("Item ID required.");

  const file = formData.get("receipt") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided.");

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) throw new Error("File size must be under 5 MB.");

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) throw new Error("Only JPEG, PNG, WebP, and PDF are allowed.");

  const ext = file.type.split("/")[1];
  const fileName = `receipt-${Date.now()}.${ext}`;

  const [item] = await getDb()
    .select({ id: expenseItems.id, claimId: expenseItems.claimId, receiptUrl: expenseItems.receiptUrl })
    .from(expenseItems)
    .where(eq(expenseItems.id, itemId))
    .limit(1);

  if (!item) throw new Error("Expense item not found.");

  const { put, del } = await import("@vercel/blob");

  if (item.receiptUrl) {
    try { await del(item.receiptUrl); } catch { /* ignore */ }
  }

  const { url } = await put(`receipts/${item.claimId}/${fileName}`, file, { access: "public" });

  await getDb()
    .update(expenseItems)
    .set({ receiptUrl: url })
    .where(eq(expenseItems.id, itemId));

  await logAudit(user.id, "expense.receipt_uploaded", "expense_item", itemId);
  revalidatePath("/expenses");
}

export async function deleteReceipt(itemId: string) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const [item] = await getDb()
    .select({ id: expenseItems.id, receiptUrl: expenseItems.receiptUrl })
    .from(expenseItems)
    .where(eq(expenseItems.id, itemId))
    .limit(1);

  if (!item || !item.receiptUrl) throw new Error("No receipt to delete.");

  const { del } = await import("@vercel/blob");
  try { await del(item.receiptUrl); } catch { /* ignore */ }

  await getDb()
    .update(expenseItems)
    .set({ receiptUrl: null })
    .where(eq(expenseItems.id, itemId));

  await logAudit(user.id, "expense.receipt_deleted", "expense_item", itemId);
  revalidatePath("/expenses");
}

export async function linkToInvoice(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const parsed = expenseLinkInvoiceSchema.parse({
    expenseClaimId: formData.get("expenseClaimId"),
    invoiceId: formData.get("invoiceId"),
    amountCents: dollarsToCents(formData.get("amountCents")),
  });

  await getDb().insert(expenseToInvoiceLinks).values({
    expenseClaimId: parsed.expenseClaimId,
    invoiceId: parsed.invoiceId,
    amountCents: parsed.amountCents,
  });

  await logAudit(user.id, "expense.linked_to_invoice", "expense_claim", parsed.expenseClaimId);
  revalidatePath("/expenses");
}

export async function unlinkFromInvoice(linkId: string) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  await getDb().delete(expenseToInvoiceLinks).where(eq(expenseToInvoiceLinks.id, linkId));
  await logAudit(user.id, "expense.unlinked_from_invoice", "expense_to_invoice_link", linkId);
  revalidatePath("/expenses");
}

export async function createCategory(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const parsed = expenseCategorySchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
  });

  await getDb().insert(expenseCategories).values({
    name: parsed.name,
    description: parsed.description || null,
    type: parsed.type,
  });

  await logAudit(user.id, "expense.category_created", "expense_category");
  revalidatePath("/expenses/categories");
}

export async function updateCategory(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("Category ID required.");

  const parsed = expenseCategorySchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
  });

  await getDb()
    .update(expenseCategories)
    .set({ name: parsed.name, description: parsed.description || null, type: parsed.type })
    .where(eq(expenseCategories.id, id));

  await logAudit(user.id, "expense.category_updated", "expense_category", id);
  revalidatePath("/expenses/categories");
}

export async function toggleCategory(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "expenses");

  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("Category ID required.");

  const [category] = await getDb()
    .select({ id: expenseCategories.id, isActive: expenseCategories.isActive })
    .from(expenseCategories)
    .where(eq(expenseCategories.id, id))
    .limit(1);

  if (!category) throw new Error("Category not found.");

  await getDb()
    .update(expenseCategories)
    .set({ isActive: !category.isActive })
    .where(eq(expenseCategories.id, id));

  await logAudit(user.id, `expense.category_${category.isActive ? "deactivated" : "activated"}`, "expense_category", id);
  revalidatePath("/expenses/categories");
}

export async function getMyEmployee(user?: { id: string; name: string; email: string; roles: string[] }) {
  if (!user) user = await requireUser();
  const [employee] = await getDb()
    .select({ id: employees.id, fullName: employees.fullName })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);
  if (employee) return employee;

  const isPrivileged = user.roles.includes("admin") || user.roles.includes("manager");
  if (!isPrivileged) return null;

  const [department] = await getDb()
    .select({ id: departments.id })
    .from(departments)
    .limit(1);

  const [created] = await getDb()
    .insert(employees)
    .values({
      userId: user.id,
      fullName: user.name,
      email: user.email,
      designation: user.roles.includes("admin") ? "CEO" : "Manager",
      departmentId: department?.id || null,
      joiningDate: new Date().toISOString().split("T")[0],
      status: "active",
    })
    .returning({ id: employees.id, fullName: employees.fullName });

  return created;
}

function extractItemsFromForm(formData: FormData) {
  const descriptions = formData.getAll("itemDescription");
  const amounts = formData.getAll("itemAmount");
  const dates = formData.getAll("itemDate");
  const categoryIds = formData.getAll("itemCategoryId");

  const items: { categoryId?: string; description: string; amountCents: number; expenseDate: string }[] = [];

  for (let i = 0; i < descriptions.length; i++) {
    const description = String(descriptions[i] ?? "").trim();
    const amountStr = String(amounts[i] ?? "");
    const date = String(dates[i] ?? "");
    const categoryId = String(categoryIds[i] ?? "");

    if (!description) continue;

    items.push({
      ...(categoryId ? { categoryId } : {}),
      description,
      amountCents: dollarsToCents(amountStr),
      expenseDate: date,
    });
  }

  return items;
}
