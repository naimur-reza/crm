import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  invoices,
  invoiceItems,
  paymentRecords,
  invoiceMatchSuggestions,
  clients,
} from "@/lib/db/schema";

export async function getInvoiceMatchSuggestions(invoiceId: string) {
  return getDb()
    .select()
    .from(invoiceMatchSuggestions)
    .where(
      and(
        eq(invoiceMatchSuggestions.invoiceId, invoiceId),
        eq(invoiceMatchSuggestions.status, "pending"),
      ),
    )
    .orderBy(desc(invoiceMatchSuggestions.confidence));
}

export async function upsertInvoiceMatchSuggestion(
  invoiceId: string,
  paymentRecordId: string,
  data: { confidence: number; reasoning: string },
) {
  const [existing] = await getDb()
    .select()
    .from(invoiceMatchSuggestions)
    .where(
      and(
        eq(invoiceMatchSuggestions.invoiceId, invoiceId),
        eq(invoiceMatchSuggestions.paymentRecordId, paymentRecordId),
      ),
    )
    .limit(1);

  if (existing) {
    await getDb()
      .update(invoiceMatchSuggestions)
      .set({ confidence: data.confidence, reasoning: data.reasoning })
      .where(eq(invoiceMatchSuggestions.id, existing.id));
  } else {
    await getDb()
      .insert(invoiceMatchSuggestions)
      .values({ invoiceId, paymentRecordId, ...data });
  }
}

export async function acceptMatchSuggestion(suggestionId: string) {
  await getDb()
    .update(invoiceMatchSuggestions)
    .set({ status: "accepted" })
    .where(eq(invoiceMatchSuggestions.id, suggestionId));
}

export async function rejectMatchSuggestion(suggestionId: string) {
  await getDb()
    .update(invoiceMatchSuggestions)
    .set({ status: "rejected" })
    .where(eq(invoiceMatchSuggestions.id, suggestionId));
}

export async function getInvoiceMatchingData(invoiceId: string) {
  const db = getDb();

  const [invoice] = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      totalCents: invoices.totalCents,
      dueDate: invoices.dueDate,
      clientName: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) return null;

  const items = await db
    .select({ description: invoiceItems.description })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const payments = await db
    .select({
      amountCents: paymentRecords.amountCents,
      paymentDate: paymentRecords.paymentDate,
      reference: paymentRecords.reference,
      notes: paymentRecords.notes,
    })
    .from(paymentRecords)
    .where(eq(paymentRecords.invoiceId, invoiceId));

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceTotalCents: invoice.totalCents,
    invoiceDueDate: invoice.dueDate ?? "",
    clientName: invoice.clientName ?? "Unknown",
    invoiceItems: items.map((i) => i.description),
    payments: payments.map((p) => ({
      amountCents: p.amountCents,
      paymentDate: p.paymentDate,
      reference: p.reference,
      notes: p.notes,
    })),
  };
}
