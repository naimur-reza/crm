"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { invoices, leadActivities, leads, workOrders } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { generateWorkOrderNumber } from "@/lib/db/queries/work-orders";
import { crmTags, updateCrmTags } from "@/lib/crm/cache";

function parseFormData(formData: FormData) {
  return {
    workOrderId: String(formData.get("workOrderId") ?? ""),
    status: String(formData.get("status") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export async function ensureWorkOrderForLead(leadId: string) {
  const [existing] = await getDb()
    .select({ id: workOrders.id })
    .from(workOrders)
    .where(eq(workOrders.leadId, leadId))
    .limit(1);
  if (existing) return existing;

  const [lead] = await getDb()
    .select({ title: leads.title, valueCents: leads.valueCents, clientId: leads.clientId })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  if (!lead) return null;

  const workOrderNumber = await generateWorkOrderNumber();
  const [wo] = await getDb()
    .insert(workOrders)
    .values({
      workOrderNumber,
      leadId,
      clientId: lead.clientId,
      title: `Work Order - ${lead.title}`,
      totalValueCents: lead.valueCents,
    })
    .returning({ id: workOrders.id });

  await getDb().insert(leadActivities).values({
    leadId,
    type: "note",
    summary: `Work order ${workOrderNumber} created.`,
  });

  return wo;
}

export async function updateWorkOrderStatus(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "work_orders");

  const { workOrderId, status } = parseFormData(formData);
  if (!workOrderId || !status) throw new Error("Missing required fields");

  await getDb()
    .update(workOrders)
    .set({ status: status as "pending" | "in_progress" | "completed" | "cancelled", updatedAt: new Date() })
    .where(eq(workOrders.id, workOrderId));

  await logAudit(user.id, "work_order.status_updated", "work_order", workOrderId, { status });
  revalidatePath("/work-orders");
  updateCrmTags([crmTags.leads, crmTags.activities]);
}

export async function updateWorkOrderNotes(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "work_orders");

  const { workOrderId, notes } = parseFormData(formData);
  if (!workOrderId) throw new Error("Missing work order id");

  await getDb()
    .update(workOrders)
    .set({ notes: notes || null, updatedAt: new Date() })
    .where(eq(workOrders.id, workOrderId));

  await logAudit(user.id, "work_order.notes_updated", "work_order", workOrderId);
  revalidatePath("/work-orders");
}

export async function linkInvoiceToWorkOrder(formData: FormData) {
  const user = await requireUser();
  requirePermission(user.roles, "work_orders");

  const workOrderId = String(formData.get("workOrderId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!workOrderId || !invoiceId) throw new Error("Missing required fields");

  await getDb()
    .update(invoices)
    .set({ workOrderId, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  await logAudit(user.id, "work_order.invoice_linked", "work_order", workOrderId, { invoiceId });
  revalidatePath("/work-orders");
  revalidatePath("/crm/invoices");
  updateCrmTags([crmTags.invoices]);
}
