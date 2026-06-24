import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leadSentiments, interactionSentiments } from "@/lib/db/schema";
import type { SentimentLabel } from "@/lib/ai/types";

export async function getLeadActivitySentiment(activityId: string) {
  const [row] = await getDb()
    .select()
    .from(leadSentiments)
    .where(eq(leadSentiments.activityId, activityId))
    .limit(1);
  return row ?? null;
}

export async function upsertLeadActivitySentiment(
  activityId: string,
  data: { label: SentimentLabel; score: number; keyPhrases: string[] },
) {
  const existing = await getLeadActivitySentiment(activityId);
  if (existing) {
    await getDb()
      .update(leadSentiments)
      .set({ label: data.label, score: data.score, keyPhrases: data.keyPhrases })
      .where(eq(leadSentiments.activityId, activityId));
  } else {
    await getDb().insert(leadSentiments).values({ activityId, ...data });
  }
}

export async function getInteractionSentiment(interactionId: string) {
  const [row] = await getDb()
    .select()
    .from(interactionSentiments)
    .where(eq(interactionSentiments.interactionId, interactionId))
    .limit(1);
  return row ?? null;
}

export async function upsertInteractionSentiment(
  interactionId: string,
  data: { label: SentimentLabel; score: number; keyPhrases: string[] },
) {
  const existing = await getInteractionSentiment(interactionId);
  if (existing) {
    await getDb()
      .update(interactionSentiments)
      .set({ label: data.label, score: data.score, keyPhrases: data.keyPhrases })
      .where(eq(interactionSentiments.interactionId, interactionId));
  } else {
    await getDb().insert(interactionSentiments).values({ interactionId, ...data });
  }
}
