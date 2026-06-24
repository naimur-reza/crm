"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { crmTags, updateCrmTags } from "@/lib/crm/cache";
import { dollarsToCents } from "@/lib/crm/money";
import { getDb } from "@/lib/db";
import {
  clients,
  crmPipelines,
  crmStages,
  invoiceItems,
  invoices,
  leadActivities,
  leadContacts,
  leads,
  leadStageHistory,
  notificationLogs,
  notificationTemplates,
  paymentRecords,
} from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { ensureWorkOrderForLead } from "@/app/actions/work-orders";
import { generateInvoicePdf } from "@/lib/invoices/pdf";
import { buildInvoicePdfUrl, buildInvoiceShareUrl } from "@/lib/invoices/pdf-token";
import { sendEmailWithAttachment } from "@/lib/notifications/email";
import { buildWhatsAppLink, renderTemplate } from "@/lib/notifications/whatsapp";
import {
  invoiceEmailSchema,
  invoiceSchema,
  invoiceUpdateSchema,
  invoiceWhatsAppSchema,
  leadActivitySchema,
  leadInlineActivitySchema,
  leadNotesSchema,
  leadProfileSchema,
  leadSchema,
  leadStageSchema,
  notificationTemplateSchema,
  paymentSchema,
  whatsappLogSchema,
} from "@/lib/validation/crm";

const emptyToNull = (value?: string) => (value ? value : null);

function formatTk(cents: number | null | undefined) {
  return `TK ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100)}`;
}

async function getRequestOrigin() {
  const headerList = await headers();
  return (
    headerList.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

async function getDefaultPipelineAndStage(stageId?: string) {
  const db = getDb();
  const [pipeline] = await db
    .select({ id: crmPipelines.id })
    .from(crmPipelines)
    .where(eq(crmPipelines.isDefault, true))
    .limit(1);

  if (!pipeline) {
    throw new Error("CRM pipeline is missing. Run pnpm db:seed first.");
  }

  const [stage] = stageId
    ? await db
        .select({ id: crmStages.id })
        .from(crmStages)
        .where(eq(crmStages.id, stageId))
        .limit(1)
    : await db
        .select({ id: crmStages.id })
        .from(crmStages)
        .where(eq(crmStages.pipelineId, pipeline.id))
        .orderBy(crmStages.sortOrder)
        .limit(1);

  if (!stage) {
    throw new Error("CRM stages are missing. Run pnpm db:seed first.");
  }

  return { pipelineId: pipeline.id, stageId: stage.id };
}

export async function createLead(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = leadSchema.parse({
    title: formData.get("title"),
    companyName: formData.get("companyName") || undefined,
    source: formData.get("source") || undefined,
    value: formData.get("value") || undefined,
    expectedCloseDate: formData.get("expectedCloseDate") || undefined,
    ownerEmployeeId: formData.get("ownerEmployeeId") || "",
    stageId: formData.get("stageId") || "",
    contactName: formData.get("contactName") || undefined,
    contactEmail: formData.get("contactEmail") || "",
    contactPhone: formData.get("contactPhone") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
    notes: formData.get("notes") || undefined,
  });
  const { pipelineId, stageId } = await getDefaultPipelineAndStage(
    parsed.stageId || undefined,
  );
  const [lead] = await getDb()
    .insert(leads)
    .values({
      pipelineId,
      stageId,
      title: parsed.title,
      companyName: parsed.companyName,
      source: parsed.source,
      valueCents: dollarsToCents(formData.get("value")),
      expectedCloseDate: emptyToNull(parsed.expectedCloseDate),
      ownerEmployeeId: emptyToNull(parsed.ownerEmployeeId),
      notes: parsed.notes,
    })
    .returning({ id: leads.id });

  if (parsed.contactName) {
    await getDb().insert(leadContacts).values({
      leadId: lead.id,
      name: parsed.contactName,
      email: parsed.contactEmail || null,
      phone: parsed.contactPhone,
      whatsappNumber: parsed.whatsappNumber,
      isPrimary: true,
    });
  }

  await logAudit(user.id, "lead.created", "lead", lead.id);
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  revalidatePath("/dashboard");
  updateCrmTags([crmTags.leads, crmTags.pipeline, crmTags.activities, crmTags.lead(lead.id)]);
}

export async function updateLeadStage(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = leadStageSchema.parse({
    leadId: formData.get("leadId"),
    stageId: formData.get("stageId"),
  });
  const [currentLead] = await getDb()
    .select({ stageId: leads.stageId })
    .from(leads)
    .where(eq(leads.id, parsed.leadId))
    .limit(1);
  const [stage] = await getDb()
    .select({ isWon: crmStages.isWon, isLost: crmStages.isLost })
    .from(crmStages)
    .where(eq(crmStages.id, parsed.stageId))
    .limit(1);

  await getDb()
    .update(leads)
    .set({
      stageId: parsed.stageId,
      status: stage?.isWon ? "won" : stage?.isLost ? "lost" : "open",
      updatedAt: new Date(),
    })
    .where(eq(leads.id, parsed.leadId));
  await getDb().insert(leadStageHistory).values({
    leadId: parsed.leadId,
    fromStageId: currentLead?.stageId,
    toStageId: parsed.stageId,
    userId: user.id,
  });
  await getDb().insert(leadActivities).values({
    leadId: parsed.leadId,
    type: "note",
    summary: `Stage changed to ${stage?.isWon ? "Won" : stage?.isLost ? "Lost" : "active pipeline stage"}.`,
    userId: user.id,
  });
  await logAudit(user.id, "lead.stage_updated", "lead", parsed.leadId);

  if (stage?.isWon) {
    await ensureWorkOrderForLead(parsed.leadId);
  }

  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  revalidatePath("/work-orders");
  updateCrmTags([crmTags.leads, crmTags.pipeline, crmTags.activities, crmTags.lead(parsed.leadId)]);
}

export async function updateLeadNotes(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = leadNotesSchema.parse({
    leadId: formData.get("leadId"),
    notes: formData.get("notes") || undefined,
  });
  const notes = parsed.notes?.trim() || null;

  await getDb()
    .update(leads)
    .set({ notes, updatedAt: new Date() })
    .where(eq(leads.id, parsed.leadId));
  await getDb().insert(leadActivities).values({
    leadId: parsed.leadId,
    type: "note",
    summary: notes ? "Lead summary notes updated." : "Lead summary notes cleared.",
    userId: user.id,
  });
  await logAudit(user.id, "lead.notes_updated", "lead", parsed.leadId);
  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${parsed.leadId}`);
  updateCrmTags([crmTags.leads, crmTags.activities, crmTags.lead(parsed.leadId)]);
}

export async function updateLeadProfile(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = leadProfileSchema.parse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    companyName: formData.get("companyName") || undefined,
    source: formData.get("source") || undefined,
    value: formData.get("value") || undefined,
    expectedCloseDate: formData.get("expectedCloseDate") || undefined,
    ownerEmployeeId: formData.get("ownerEmployeeId") || "",
  });

  await getDb()
    .update(leads)
    .set({
      title: parsed.title,
      companyName: parsed.companyName,
      source: parsed.source,
      valueCents: dollarsToCents(formData.get("value")),
      expectedCloseDate: emptyToNull(parsed.expectedCloseDate),
      ownerEmployeeId: emptyToNull(parsed.ownerEmployeeId),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, parsed.leadId));
  await getDb().insert(leadActivities).values({
    leadId: parsed.leadId,
    type: "note",
    summary: "Lead profile updated.",
    userId: user.id,
  });
  await logAudit(user.id, "lead.profile_updated", "lead", parsed.leadId);
  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  revalidatePath(`/crm/leads/${parsed.leadId}`);
  updateCrmTags([crmTags.leads, crmTags.pipeline, crmTags.activities, crmTags.lead(parsed.leadId)]);
}

export async function deleteLead(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const leadId = String(formData.get("id"));
  if (!leadId) throw new Error("Lead id is required.");

  await getDb().delete(leads).where(eq(leads.id, leadId));
  await logAudit(user.id, "lead.deleted", "lead", leadId);
  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  updateCrmTags([crmTags.leads, crmTags.pipeline, crmTags.activities, crmTags.lead(leadId)]);
}

export async function convertLeadToClient(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const leadId = String(formData.get("leadId"));
  const [lead] = await getDb().select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error("Lead was not found.");

  const [client] = await getDb()
    .insert(clients)
    .values({
      name: lead.companyName || lead.title,
      ownerEmployeeId: lead.ownerEmployeeId,
      status: "active",
      source: lead.source,
      notes: lead.notes,
    })
    .returning({ id: clients.id });

  await getDb()
    .update(leads)
    .set({ clientId: client.id, status: "won", updatedAt: new Date() })
    .where(eq(leads.id, leadId));
  await getDb().insert(leadActivities).values({
    leadId,
    type: "note",
    summary: `Converted to client account: ${lead.companyName || lead.title}.`,
    userId: user.id,
  });
  await logAudit(user.id, "lead.converted_to_client", "lead", leadId, {
    clientId: client.id,
  });

  await ensureWorkOrderForLead(leadId);

  revalidatePath("/crm/leads");
  revalidatePath("/crm/clients");
  revalidatePath("/clients");
  revalidatePath("/work-orders");
  updateCrmTags([crmTags.leads, crmTags.pipeline, crmTags.clients, crmTags.activities, crmTags.lead(leadId)]);
}

export async function addLeadActivity(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = leadActivitySchema.parse({
    leadId: formData.get("leadId"),
    type: formData.get("type"),
    summary: formData.get("summary"),
    dueAt: formData.get("dueAt") || undefined,
  });
  await getDb().insert(leadActivities).values({
    leadId: parsed.leadId,
    type: parsed.type,
    summary: parsed.summary,
    dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
    userId: user.id,
  });
  await logAudit(user.id, "lead.activity_added", "lead", parsed.leadId);
  revalidatePath("/crm/activities");
  revalidatePath("/crm/leads");
  updateCrmTags([crmTags.activities, crmTags.leads, crmTags.lead(parsed.leadId)]);
}

export async function logLeadInlineActivity(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = leadInlineActivitySchema.parse({
    leadId: formData.get("leadId"),
    type: formData.get("type"),
  });
  const summary = parsed.type === "call" ? "Phone call logged." : "Email sent.";

  await getDb().insert(leadActivities).values({
    leadId: parsed.leadId,
    type: parsed.type,
    summary,
    userId: user.id,
  });
  await logAudit(user.id, "lead.activity_added", "lead", parsed.leadId);
  revalidatePath("/crm/activities");
  revalidatePath("/crm/leads");
  updateCrmTags([crmTags.activities, crmTags.leads, crmTags.lead(parsed.leadId)]);
}

export async function createInvoice(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = invoiceSchema.parse({
    leadId: formData.get("leadId") || "",
    clientId: formData.get("clientId") || "",
    workOrderId: formData.get("workOrderId") || "",
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate") || undefined,
    itemDescription: formData.get("itemDescription"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    discount: formData.get("discount") || undefined,
    tax: formData.get("tax") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const unitPriceCents = dollarsToCents(formData.get("unitPrice"));
  const subtotalCents = unitPriceCents * parsed.quantity;
  const discountCents = dollarsToCents(formData.get("discount"));
  const taxCents = dollarsToCents(formData.get("tax"));
  const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);
  const invoiceNumber = `INV-${Date.now()}`;

  const [invoice] = await getDb()
    .insert(invoices)
    .values({
      invoiceNumber,
      leadId: emptyToNull(parsed.leadId),
      clientId: emptyToNull(parsed.clientId),
      workOrderId: emptyToNull(parsed.workOrderId),
      issueDate: parsed.issueDate,
      dueDate: emptyToNull(parsed.dueDate),
      subtotalCents,
      discountCents,
      taxCents,
      totalCents,
      notes: parsed.notes,
    })
    .returning({ id: invoices.id });

  await getDb().insert(invoiceItems).values({
    invoiceId: invoice.id,
    description: parsed.itemDescription,
    quantity: parsed.quantity,
    unitPriceCents,
    totalCents: subtotalCents,
  });
  if (parsed.leadId) {
    await getDb().insert(leadActivities).values({
      leadId: parsed.leadId,
      type: "note",
      summary: `Invoice ${invoiceNumber} created for ${formatTk(totalCents)}.`,
      userId: user.id,
    });
  }
  await logAudit(user.id, "invoice.created", "invoice", invoice.id);
  revalidatePath("/crm/invoices");
  revalidatePath("/crm/payments");
  if (parsed.workOrderId) {
    revalidatePath("/work-orders");
  }
  updateCrmTags([
    crmTags.invoices,
    crmTags.payments,
    crmTags.activities,
    crmTags.invoice(invoice.id),
    ...(parsed.leadId ? [crmTags.lead(parsed.leadId)] : []),
  ]);
}

export async function markInvoiceSent(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");
  const invoiceId = String(formData.get("invoiceId"));
  await getDb()
    .update(invoices)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));
  await logAudit(user.id, "invoice.sent", "invoice", invoiceId);
  revalidatePath("/crm/invoices");
  updateCrmTags([crmTags.invoices, crmTags.invoice(invoiceId)]);
}

export async function updateInvoice(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = invoiceUpdateSchema.parse({
    invoiceId: formData.get("invoiceId"),
    status: formData.get("status"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate") || undefined,
    discount: formData.get("discount") || undefined,
    tax: formData.get("tax") || undefined,
    notes: formData.get("notes") || undefined,
  });
  const [invoice] = await getDb()
    .select({ subtotalCents: invoices.subtotalCents, leadId: invoices.leadId })
    .from(invoices)
    .where(eq(invoices.id, parsed.invoiceId))
    .limit(1);
  if (!invoice) throw new Error("Invoice was not found.");

  const discountCents = dollarsToCents(formData.get("discount"));
  const taxCents = dollarsToCents(formData.get("tax"));
  const totalCents = Math.max(0, invoice.subtotalCents - discountCents + taxCents);

  await getDb()
    .update(invoices)
    .set({
      status: parsed.status,
      issueDate: parsed.issueDate,
      dueDate: emptyToNull(parsed.dueDate),
      discountCents,
      taxCents,
      totalCents,
      notes: parsed.notes,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, parsed.invoiceId));
  if (invoice.leadId) {
    await getDb().insert(leadActivities).values({
      leadId: invoice.leadId,
      type: "note",
      summary: "Invoice details updated.",
      userId: user.id,
    });
  }
  await logAudit(user.id, "invoice.updated", "invoice", parsed.invoiceId);
  revalidatePath("/crm");
  revalidatePath("/crm/invoices");
  revalidatePath(`/crm/invoices/${parsed.invoiceId}`);
  revalidatePath("/crm/payments");
  updateCrmTags([
    crmTags.invoices,
    crmTags.payments,
    crmTags.invoice(parsed.invoiceId),
    ...(invoice.leadId ? [crmTags.activities, crmTags.lead(invoice.leadId)] : []),
  ]);
}

export async function deleteInvoice(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const invoiceId = String(formData.get("id"));
  if (!invoiceId) throw new Error("Invoice id is required.");

  await getDb().delete(invoices).where(eq(invoices.id, invoiceId));
  await logAudit(user.id, "invoice.deleted", "invoice", invoiceId);
  revalidatePath("/crm");
  revalidatePath("/crm/invoices");
  revalidatePath("/crm/payments");
  updateCrmTags([crmTags.invoices, crmTags.payments, crmTags.invoice(invoiceId)]);
}

async function refreshInvoicePaymentStatus(invoiceId: string) {
  const [invoice] = await getDb()
    .select({ totalCents: invoices.totalCents })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  const [paymentTotal] = await getDb()
    .select({ total: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int` })
    .from(paymentRecords)
    .where(eq(paymentRecords.invoiceId, invoiceId));
  const paid = paymentTotal?.total ?? 0;
  await getDb()
    .update(invoices)
    .set({
      status: paid >= (invoice?.totalCents ?? 0) ? "paid" : paid > 0 ? "partially_paid" : "sent",
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));
}

export async function recordPayment(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = paymentSchema.parse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    method: formData.get("method"),
    reference: formData.get("reference") || undefined,
    notes: formData.get("notes") || undefined,
  });
  await getDb().insert(paymentRecords).values({
    invoiceId: parsed.invoiceId,
    amountCents: dollarsToCents(formData.get("amount")),
    paymentDate: parsed.paymentDate,
    method: parsed.method,
    reference: parsed.reference,
    notes: parsed.notes,
    createdByUserId: user.id,
  });
  const [invoice] = await getDb()
    .select({ leadId: invoices.leadId, invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.id, parsed.invoiceId))
    .limit(1);
  await refreshInvoicePaymentStatus(parsed.invoiceId);
  if (invoice?.leadId) {
    await getDb().insert(leadActivities).values({
      leadId: invoice.leadId,
      type: "note",
      summary: `Payment recorded for ${invoice.invoiceNumber}: ${formatTk(dollarsToCents(formData.get("amount")))}.`,
      userId: user.id,
    });
  }
  await logAudit(user.id, "payment.recorded", "invoice", parsed.invoiceId);
  revalidatePath("/crm/invoices");
  revalidatePath("/crm/payments");
  updateCrmTags([
    crmTags.invoices,
    crmTags.payments,
    crmTags.invoice(parsed.invoiceId),
    ...(invoice?.leadId ? [crmTags.activities, crmTags.lead(invoice.leadId)] : []),
  ]);
}

export async function createNotificationTemplate(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");
  const parsed = notificationTemplateSchema.parse({
    key: formData.get("key"),
    name: formData.get("name"),
    body: formData.get("body"),
  });
  await getDb()
    .insert(notificationTemplates)
    .values(parsed)
    .onConflictDoUpdate({
      target: notificationTemplates.key,
      set: { name: parsed.name, body: parsed.body, updatedAt: new Date() },
    });
  await logAudit(user.id, "notification_template.upserted", "notification_template");
  revalidatePath("/crm/templates");
  updateCrmTags([crmTags.templates]);
}

export async function generateWhatsAppMessage(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");
  const parsed = whatsappLogSchema.parse({
    templateId: formData.get("templateId"),
    leadId: formData.get("leadId") || "",
    clientId: formData.get("clientId") || "",
    invoiceId: formData.get("invoiceId") || "",
    recipientName: formData.get("recipientName") || undefined,
    recipientPhone: formData.get("recipientPhone"),
  });
  const [template] = await getDb()
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.id, parsed.templateId))
    .limit(1);
  if (!template) throw new Error("Notification template was not found.");

  const [lead] = parsed.leadId
    ? await getDb().select().from(leads).where(eq(leads.id, parsed.leadId)).limit(1)
    : [];
  const [client] = parsed.clientId
    ? await getDb().select().from(clients).where(eq(clients.id, parsed.clientId)).limit(1)
    : [];
  const [invoice] = parsed.invoiceId
    ? await getDb().select().from(invoices).where(eq(invoices.id, parsed.invoiceId)).limit(1)
    : [];

  const message = renderTemplate(template.body, {
    client_name: client?.name ?? lead?.companyName ?? parsed.recipientName,
    lead_name: lead?.title,
    invoice_number: invoice?.invoiceNumber,
    invoice_total: invoice ? formatTk(invoice.totalCents) : "",
    due_date: invoice?.dueDate,
    payment_balance: invoice ? formatTk(invoice.totalCents) : "",
    company_name: "Company Tools",
  });
  const waLink = buildWhatsAppLink(parsed.recipientPhone, message);

  await getDb().insert(notificationLogs).values({
    templateId: parsed.templateId,
    leadId: emptyToNull(parsed.leadId),
    clientId: emptyToNull(parsed.clientId),
    invoiceId: emptyToNull(parsed.invoiceId),
    recipientName: parsed.recipientName,
    recipientPhone: parsed.recipientPhone,
    message,
    waLink,
    actorUserId: user.id,
  });
  if (parsed.leadId) {
    await getDb().insert(leadActivities).values({
      leadId: parsed.leadId,
      type: "whatsapp",
      summary: `Generated WhatsApp message for ${parsed.recipientName || parsed.recipientPhone}.`,
      userId: user.id,
    });
  }
  await logAudit(user.id, "notification.whatsapp_generated", "notification_template", parsed.templateId);
  revalidatePath("/crm/templates");
  revalidatePath("/crm/invoices");
  updateCrmTags([
    crmTags.templates,
    crmTags.invoices,
    crmTags.activities,
    ...(parsed.leadId ? [crmTags.lead(parsed.leadId)] : []),
    ...(parsed.invoiceId ? [crmTags.invoice(parsed.invoiceId)] : []),
  ]);
}

export async function sendInvoiceEmail(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = invoiceEmailSchema.parse({
    invoiceId: formData.get("invoiceId"),
    recipientName: formData.get("recipientName") || undefined,
    recipientEmail: formData.get("recipientEmail"),
    message: formData.get("message") || undefined,
  });
  const origin = await getRequestOrigin();
  const shareUrl = buildInvoiceShareUrl(origin, parsed.invoiceId);
  const pdfUrl = buildInvoicePdfUrl(origin, parsed.invoiceId);
  const { bytes, fileName, data } = await generateInvoicePdf(parsed.invoiceId, shareUrl);
  const message =
    parsed.message?.trim() ||
    `Please find invoice ${data.invoice.invoiceNumber} attached as a PDF.`;

  await sendEmailWithAttachment({
    to: parsed.recipientEmail,
    subject: `Invoice ${data.invoice.invoiceNumber}`,
    text: `${message}\n\nInvoice PDF link: ${pdfUrl}`,
    attachmentName: fileName,
    attachmentBytes: bytes,
  });

  await getDb()
    .update(invoices)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(invoices.id, parsed.invoiceId));
  if (data.invoice.leadId) {
    await getDb().insert(leadActivities).values({
      leadId: data.invoice.leadId,
      type: "email",
      summary: `Invoice ${data.invoice.invoiceNumber} emailed to ${parsed.recipientEmail}.`,
      userId: user.id,
    });
  }
  await logAudit(user.id, "invoice.email_sent", "invoice", parsed.invoiceId, {
    recipientEmail: parsed.recipientEmail,
  });
  revalidatePath("/crm/invoices");
  revalidatePath(`/crm/invoices/${parsed.invoiceId}`);
  updateCrmTags([
    crmTags.invoices,
    crmTags.invoice(parsed.invoiceId),
    ...(data.invoice.leadId ? [crmTags.activities, crmTags.lead(data.invoice.leadId)] : []),
  ]);
}

export async function createInvoiceWhatsAppLink(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "crm");

  const parsed = invoiceWhatsAppSchema.parse({
    invoiceId: formData.get("invoiceId"),
    recipientName: formData.get("recipientName") || undefined,
    recipientPhone: formData.get("recipientPhone"),
    message: formData.get("message") || undefined,
  });
  const origin = await getRequestOrigin();
  const shareUrl = buildInvoiceShareUrl(origin, parsed.invoiceId);
  const { data } = await generateInvoicePdf(parsed.invoiceId, shareUrl);
  const message = [
    parsed.message?.trim() ||
      `Please review invoice ${data.invoice.invoiceNumber}.`,
    "",
    `Invoice: ${data.invoice.invoiceNumber}`,
    `Total: ${formatTk(data.invoice.totalCents)}`,
    `Paid: ${formatTk(data.invoice.paidCents ?? 0)}`,
    `Due: ${formatTk(data.balanceCents)}`,
    `Invoice link: ${shareUrl}`,
  ].join("\n");
  const waLink = buildWhatsAppLink(parsed.recipientPhone, message);

  await getDb().insert(notificationLogs).values({
    leadId: emptyToNull(data.invoice.leadId ?? ""),
    clientId: emptyToNull(data.invoice.clientId ?? ""),
    invoiceId: parsed.invoiceId,
    recipientName: parsed.recipientName || data.accountName,
    recipientPhone: parsed.recipientPhone,
    message,
    waLink,
    actorUserId: user.id,
  });
  await getDb()
    .update(invoices)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(invoices.id, parsed.invoiceId));
  if (data.invoice.leadId) {
    await getDb().insert(leadActivities).values({
      leadId: data.invoice.leadId,
      type: "whatsapp",
      summary: `Invoice ${data.invoice.invoiceNumber} WhatsApp link generated for ${parsed.recipientName || parsed.recipientPhone}.`,
      userId: user.id,
    });
  }
  await logAudit(user.id, "invoice.whatsapp_link_generated", "invoice", parsed.invoiceId, {
    recipientPhone: parsed.recipientPhone,
  });
  revalidatePath("/crm/invoices");
  revalidatePath(`/crm/invoices/${parsed.invoiceId}`);
  updateCrmTags([
    crmTags.invoices,
    crmTags.templates,
    crmTags.invoice(parsed.invoiceId),
    ...(data.invoice.leadId ? [crmTags.activities, crmTags.lead(data.invoice.leadId)] : []),
  ]);

  return { waLink };
}
