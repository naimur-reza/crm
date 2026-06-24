"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getAiClient, getAiModel } from "@/lib/ai/client";
import { invoiceMatchingPrompt } from "@/lib/ai/prompts";
import {
  getInvoiceMatchingData,
  upsertInvoiceMatchSuggestion,
  getInvoiceMatchSuggestions,
  acceptMatchSuggestion,
  rejectMatchSuggestion,
} from "@/lib/db/queries/ai/invoice-matching";
import { getDb } from "@/lib/db";
import { paymentRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function findInvoiceMatches(invoiceId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");

  const data = await getInvoiceMatchingData(invoiceId);
  if (!data) throw new Error("Invoice not found");

  if (data.payments.length === 0) throw new Error("No payments to match");

  const client = getAiClient();
  const response = await client.chat.completions.create({
    model: getAiModel(),
    messages: [
      {
        role: "system",
        content:
          "You are an invoice matching AI. Always respond with valid JSON array only.",
      },
      { role: "user", content: invoiceMatchingPrompt(data) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const results = JSON.parse(response.choices[0]?.message?.content ?? "[]");
  const matches = Array.isArray(results) ? results : results.matches ?? [];

  const payments = await getDb()
    .select({ id: paymentRecords.id })
    .from(paymentRecords)
    .where(eq(paymentRecords.invoiceId, invoiceId));

  for (let i = 0; i < Math.min(matches.length, payments.length); i++) {
    if (matches[i].match) {
      await upsertInvoiceMatchSuggestion(invoiceId, payments[i].id, {
        confidence: Math.round(matches[i].confidence * 100),
        reasoning: matches[i].reasoning,
      });
    }
  }

  revalidatePath(`/crm/invoices/${invoiceId}`);
  return matches;
}

export async function acceptInvoiceMatch(suggestionId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");
  await acceptMatchSuggestion(suggestionId);
  revalidatePath("/crm/invoices");
}

export async function rejectInvoiceMatch(suggestionId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");
  await rejectMatchSuggestion(suggestionId);
  revalidatePath("/crm/invoices");
}

export async function getInvoiceMatchSuggestionsAction(invoiceId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");
  return getInvoiceMatchSuggestions(invoiceId);
}
