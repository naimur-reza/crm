import { refresh } from "next/cache";

export const crmTags = {
  leads: "crm:leads",
  pipeline: "crm:pipeline",
  clients: "crm:clients",
  invoices: "crm:invoices",
  payments: "crm:payments",
  templates: "crm:templates",
  activities: "crm:activities",
  lead: (id: string) => `crm:lead:${id}`,
  invoice: (id: string) => `crm:invoice:${id}`,
} as const;

export function updateCrmTags(tags: string[]) {
  void tags;
  refresh();
}
