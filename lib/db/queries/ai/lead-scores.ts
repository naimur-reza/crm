import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leadScores, leads, crmStages, leadActivities, leadStageHistory } from "@/lib/db/schema";

export async function getLeadScore(leadId: string) {
  const [row] = await getDb()
    .select()
    .from(leadScores)
    .where(eq(leadScores.leadId, leadId))
    .limit(1);
  return row ?? null;
}

export async function upsertLeadScore(
  leadId: string,
  data: { score: number; label: "hot" | "warm" | "cold"; reasoning: string },
) {
  await getDb()
    .insert(leadScores)
    .values({ leadId, ...data })
    .onConflictDoUpdate({
      target: leadScores.leadId,
      set: { score: data.score, label: data.label, reasoning: data.reasoning, scoredAt: new Date() },
    });
}

export async function getLeadScoringData(leadId: string) {
  const db = getDb();

  const [lead] = await db
    .select({
      id: leads.id,
      title: leads.title,
      companyName: leads.companyName,
      source: leads.source,
      valueCents: leads.valueCents,
      stageId: leads.stageId,
      stageName: crmStages.name,
      stageProbability: crmStages.probability,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .leftJoin(crmStages, eq(leads.stageId, crmStages.id))
    .where(eq(leads.id, leadId))
    .limit(1);

  if (!lead) return null;

  const activities = await db
    .select({ summary: leadActivities.summary, createdAt: leadActivities.createdAt })
    .from(leadActivities)
    .where(eq(leadActivities.leadId, leadId))
    .orderBy(leadActivities.createdAt);

  const [stageHistory] = await db
    .select({ createdAt: leadStageHistory.createdAt })
    .from(leadStageHistory)
    .where(eq(leadStageHistory.leadId, leadId))
    .orderBy(leadStageHistory.createdAt)
    .limit(1);

  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(lead.createdAt).getTime()) / 86400000,
  );

  const daysInCurrentStage = stageHistory
    ? Math.floor((Date.now() - new Date(stageHistory.createdAt).getTime()) / 86400000)
    : null;

  return {
    title: lead.title,
    companyName: lead.companyName,
    source: lead.source,
    valueCents: lead.valueCents,
    stageName: lead.stageName ?? "Unknown",
    stageProbability: lead.stageProbability ?? 0,
    activitySummaries: activities.map((a) => a.summary),
    daysSinceCreated,
    daysInCurrentStage,
  };
}
