"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getAiClient, getAiModel } from "@/lib/ai/client";
import { sentimentPrompt } from "@/lib/ai/prompts";
import { aiCacheGet, aiCacheSet, aiCacheKey } from "@/lib/ai/cache";
import {
  upsertLeadActivitySentiment,
  getLeadActivitySentiment,
  upsertInteractionSentiment,
  getInteractionSentiment,
} from "@/lib/db/queries/ai/sentiments";
import { getDb } from "@/lib/db";
import { leadActivities, clientInteractions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function analyzeSentiment(text: string) {
  const cacheKey = aiCacheKey("sentiment", text);
  const cached = aiCacheGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const client = getAiClient();
  const response = await client.chat.completions.create({
    model: getAiModel(),
    messages: [
      { role: "system", content: "You are a sentiment analysis AI. Always respond with valid JSON only." },
      { role: "user", content: sentimentPrompt(text) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  aiCacheSet(cacheKey, JSON.stringify(result));
  return result;
}

export async function analyzeLeadActivitySentiment(activityId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");

  const [activity] = await getDb()
    .select({ summary: leadActivities.summary, leadId: leadActivities.leadId })
    .from(leadActivities)
    .where(eq(leadActivities.id, activityId))
    .limit(1);

  if (!activity) throw new Error("Activity not found");

  const result = await analyzeSentiment(activity.summary);
  await upsertLeadActivitySentiment(activityId, result);

  revalidatePath(`/crm/leads/${activity.leadId}`);
  return result;
}

export async function analyzeClientInteractionSentiment(interactionId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");

  const [interaction] = await getDb()
    .select({ summary: clientInteractions.summary, clientId: clientInteractions.clientId })
    .from(clientInteractions)
    .where(eq(clientInteractions.id, interactionId))
    .limit(1);

  if (!interaction) throw new Error("Interaction not found");

  const result = await analyzeSentiment(interaction.summary);
  await upsertInteractionSentiment(interactionId, result);

  revalidatePath(`/crm/clients/${interaction.clientId}`);
  return result;
}

export async function getLeadActivitySentimentAction(activityId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");
  return getLeadActivitySentiment(activityId);
}

export async function getInteractionSentimentAction(interactionId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");
  return getInteractionSentiment(interactionId);
}
