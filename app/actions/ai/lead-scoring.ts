"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getAiClient, getAiModel } from "@/lib/ai/client";
import { leadScoringPrompt } from "@/lib/ai/prompts";
import { aiCacheGet, aiCacheSet, aiCacheKey } from "@/lib/ai/cache";
import { getLeadScoringData, upsertLeadScore, getLeadScore } from "@/lib/db/queries/ai/lead-scores";

export async function scoreLead(leadId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");

  const data = await getLeadScoringData(leadId);
  if (!data) throw new Error("Lead not found");

  const cacheKey = aiCacheKey("lead-score", leadId);
  const cached = aiCacheGet(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    await upsertLeadScore(leadId, parsed);
    revalidatePath(`/crm/leads/${leadId}`);
    return parsed;
  }

  const client = getAiClient();
  const response = await client.chat.completions.create({
    model: getAiModel(),
    messages: [
      { role: "system", content: "You are a lead scoring AI assistant. Always respond with valid JSON only." },
      { role: "user", content: leadScoringPrompt(data) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");
  await upsertLeadScore(leadId, result);
  aiCacheSet(cacheKey, JSON.stringify(result));

  revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  return result;
}

export async function getLeadScoreAction(leadId: string) {
  const user = await requireUser();
  requirePermission(user, "ai");
  return getLeadScore(leadId);
}
