import "server-only";
import { sql, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leads, crmStages } from "@/lib/db/schema";
import type { ReportResult } from "./types";

export async function getCrmFunnelReport(): Promise<ReportResult> {
  const db = getDb();

  const [stageDistribution, totalLeads, wonLeads, lostLeads, pipelineInfo] = await Promise.all([
    db
      .select({
        stageName: crmStages.name,
        stageColor: crmStages.color,
        count: sql<number>`count(*)::int`,
        totalValue: sql<number>`coalesce(sum(${leads.valueCents}), 0)::int`,
      })
      .from(leads)
      .rightJoin(crmStages, eq(leads.stageId, crmStages.id))
      .groupBy(crmStages.name, crmStages.color, crmStages.sortOrder)
      .orderBy(crmStages.sortOrder),
    db.select({ value: sql<number>`count(*)::int` }).from(leads).then((r) => r[0].value),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.status, "won"))
      .then((r) => r[0].value),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.status, "lost"))
      .then((r) => r[0].value),
    db
      .select({ value: sql<number>`coalesce(sum(${leads.valueCents}), 0)::int` })
      .from(leads)
      .then((r) => r[0].value),
  ]);

  const wonPct = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const lostPct = totalLeads > 0 ? Math.round((lostLeads / totalLeads) * 100) : 0;
  const pipelineValue = pipelineInfo ?? 0;

  return {
    title: "CRM Funnel Report",
    description: "Lead pipeline stage distribution, conversion rates, and total pipeline value.",
    summaryCards: [
      { label: "Total Leads", value: totalLeads, tone: "blue" },
      { label: "Won", value: wonLeads, sub: `${wonPct}%`, tone: "green" },
      { label: "Lost", value: lostLeads, sub: `${lostPct}%`, tone: "red" },
      { label: "Pipeline Value", value: `$${(pipelineValue / 100).toLocaleString()}`, tone: "purple" },
    ],
    columns: [
      { key: "stageName", label: "Stage" },
      { key: "count", label: "Leads", format: "number" },
      { key: "totalValue", label: "Value", format: "currency" },
    ],
    rows: stageDistribution.map((r) => ({
      ...r,
      totalValue: r.totalValue,
    })),
    chartData: stageDistribution.map((r) => ({
      name: r.stageName,
      value: r.count,
    })),
    chartType: "bar",
  };
}
