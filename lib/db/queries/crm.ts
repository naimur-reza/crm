import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clientContacts,
  clientInteractions,
  clients,
  crmStages,
  employees,
  invoiceItems,
  invoices,
  leadActivities,
  leadContacts,
  leads,
  leadStageHistory,
  notificationLogs,
  paymentRecords,
  users,
} from "@/lib/db/schema";

export async function getCrmLeadList() {
  return getDb()
    .select({
      id: leads.id,
      title: leads.title,
      companyName: leads.companyName,
      source: leads.source,
      status: leads.status,
      valueCents: leads.valueCents,
      expectedCloseDate: leads.expectedCloseDate,
      stageId: leads.stageId,
      stageName: crmStages.name,
      ownerName: employees.fullName,
    })
    .from(leads)
    .leftJoin(crmStages, eq(leads.stageId, crmStages.id))
    .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id))
    .orderBy(desc(leads.createdAt));
}

export async function getCrmStages() {
  return getDb().select().from(crmStages).orderBy(asc(crmStages.sortOrder));
}

export async function getCrmEmployeeOptions() {
  return getDb().select({ id: employees.id, name: employees.fullName }).from(employees);
}

export async function getPipelineBoard() {
  const [stageRows, leadRows] = await Promise.all([
    getDb().select().from(crmStages).orderBy(asc(crmStages.sortOrder)),
    getDb()
      .select({
        id: leads.id,
        title: leads.title,
        companyName: leads.companyName,
        valueCents: leads.valueCents,
        status: leads.status,
        stageId: leads.stageId,
        ownerName: employees.fullName,
      })
      .from(leads)
      .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id)),
  ]);

  const visibleStages = stageRows.filter(
    (stage) => stage.name.toLowerCase() !== "negotiation",
  );

  return {
    stages: visibleStages.map((stage) => ({
      ...stage,
      leads: leadRows.filter((lead) => lead.stageId === stage.id),
    })),
  };
}

export async function getLeadDetail(leadId: string) {
  const [
    leadRows,
    contacts,
    activities,
    stageHistory,
    invoiceRows,
    notificationRows,
  ] = await Promise.all([
    getDb()
      .select({
        id: leads.id,
        title: leads.title,
        companyName: leads.companyName,
        source: leads.source,
        status: leads.status,
        valueCents: leads.valueCents,
        expectedCloseDate: leads.expectedCloseDate,
        lostReason: leads.lostReason,
        notes: leads.notes,
        stageId: leads.stageId,
        ownerEmployeeId: leads.ownerEmployeeId,
        stageName: crmStages.name,
        ownerName: employees.fullName,
        clientName: clients.name,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .leftJoin(crmStages, eq(leads.stageId, crmStages.id))
      .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id))
      .leftJoin(clients, eq(leads.clientId, clients.id))
      .where(eq(leads.id, leadId))
      .limit(1),
    getDb().select().from(leadContacts).where(eq(leadContacts.leadId, leadId)),
    getDb()
      .select({
        id: leadActivities.id,
        type: leadActivities.type,
        summary: leadActivities.summary,
        dueAt: leadActivities.dueAt,
        completedAt: leadActivities.completedAt,
        createdAt: leadActivities.createdAt,
        userName: users.name,
      })
      .from(leadActivities)
      .leftJoin(users, eq(leadActivities.userId, users.id))
      .where(eq(leadActivities.leadId, leadId))
      .orderBy(desc(leadActivities.createdAt)),
    getDb()
      .select({
        id: leadStageHistory.id,
        createdAt: leadStageHistory.createdAt,
        userName: users.name,
        fromStageId: leadStageHistory.fromStageId,
        toStageId: leadStageHistory.toStageId,
      })
      .from(leadStageHistory)
      .leftJoin(users, eq(leadStageHistory.userId, users.id))
      .where(eq(leadStageHistory.leadId, leadId))
      .orderBy(desc(leadStageHistory.createdAt)),
    getDb()
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        totalCents: invoices.totalCents,
        paidCents: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int`,
      })
      .from(invoices)
      .leftJoin(paymentRecords, eq(paymentRecords.invoiceId, invoices.id))
      .where(eq(invoices.leadId, leadId))
      .groupBy(invoices.id)
      .orderBy(desc(invoices.createdAt)),
    getDb()
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.leadId, leadId))
      .orderBy(desc(notificationLogs.createdAt)),
  ]);

  return {
    lead: leadRows[0],
    contacts,
    activities,
    stageHistory,
    invoices: invoiceRows,
    notifications: notificationRows,
  };
}

export async function getInvoiceDetail(invoiceId: string) {
  const [invoiceRows, items, payments, notifications] = await Promise.all([
    getDb()
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        subtotalCents: invoices.subtotalCents,
        discountCents: invoices.discountCents,
        taxCents: invoices.taxCents,
        totalCents: invoices.totalCents,
        notes: invoices.notes,
        leadId: invoices.leadId,
        clientId: invoices.clientId,
        leadTitle: leads.title,
        clientName: clients.name,
      })
      .from(invoices)
      .leftJoin(leads, eq(invoices.leadId, leads.id))
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, invoiceId))
      .limit(1),
    getDb().select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)),
    getDb()
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.invoiceId, invoiceId))
      .orderBy(desc(paymentRecords.createdAt)),
    getDb()
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.invoiceId, invoiceId))
      .orderBy(desc(notificationLogs.createdAt)),
  ]);

  const invoice = invoiceRows[0];
  const [clientContactRows, leadContactRows] = await Promise.all([
    invoice?.clientId
      ? getDb()
          .select()
          .from(clientContacts)
          .where(eq(clientContacts.clientId, invoice.clientId))
          .orderBy(desc(clientContacts.createdAt))
      : Promise.resolve([]),
    invoice?.leadId
      ? getDb()
          .select()
          .from(leadContacts)
          .where(eq(leadContacts.leadId, invoice.leadId))
          .orderBy(desc(leadContacts.createdAt))
      : Promise.resolve([]),
  ]);

  return { invoice, items, payments, notifications, clientContactRows, leadContactRows };
}

export async function getCrmOverview() {
  const [leadRows, invoiceRows, clientRows] =
    await Promise.all([
      getDb()
        .select({
          id: leads.id,
          title: leads.title,
          companyName: leads.companyName,
          status: leads.status,
          valueCents: leads.valueCents,
          expectedCloseDate: leads.expectedCloseDate,
          stageName: crmStages.name,
          ownerName: employees.fullName,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .leftJoin(crmStages, eq(leads.stageId, crmStages.id))
        .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id))
        .orderBy(desc(leads.createdAt)),
      getDb()
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          dueDate: invoices.dueDate,
          totalCents: invoices.totalCents,
          clientName: clients.name,
          leadTitle: leads.title,
          paidCents: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int`,
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(leads, eq(invoices.leadId, leads.id))
        .leftJoin(paymentRecords, eq(paymentRecords.invoiceId, invoices.id))
        .groupBy(invoices.id, clients.name, leads.title)
        .orderBy(desc(invoices.createdAt)),
      getDb().select().from(clients).orderBy(desc(clients.createdAt)),
    ]);

  const openLeads = leadRows.filter((lead) => lead.status === "open");
  const wonLeads = leadRows.filter((lead) => lead.status === "won");
  const unpaidInvoices = invoiceRows.filter(
    (invoice) => invoice.status !== "paid" && invoice.status !== "cancelled",
  );

  return {
    leads: leadRows,
    openLeads,
    wonLeads,
    activeClients: clientRows.filter((client) => client.status === "active"),
    invoiceRows,
    unpaidInvoices,
    openPipelineCents: openLeads.reduce((sum, lead) => sum + lead.valueCents, 0),
    wonRevenueCents: wonLeads.reduce((sum, lead) => sum + lead.valueCents, 0),
    invoiceBalanceCents: unpaidInvoices.reduce(
      (sum, invoice) => sum + Math.max(0, invoice.totalCents - invoice.paidCents),
      0,
    ),
  };
}

export async function getClientDetail(clientId: string) {
  const [clientRows, contacts, interactions, leadRows, invoiceRows, notificationRows] =
    await Promise.all([
      getDb()
        .select({
          id: clients.id,
          name: clients.name,
          status: clients.status,
          source: clients.source,
          website: clients.website,
          notes: clients.notes,
          ownerEmployeeId: clients.ownerEmployeeId,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
          ownerName: employees.fullName,
        })
        .from(clients)
        .leftJoin(employees, eq(clients.ownerEmployeeId, employees.id))
        .where(eq(clients.id, clientId))
        .limit(1),
      getDb()
        .select()
        .from(clientContacts)
        .where(eq(clientContacts.clientId, clientId))
        .orderBy(desc(clientContacts.createdAt)),
      getDb()
        .select({
          id: clientInteractions.id,
          type: clientInteractions.type,
          summary: clientInteractions.summary,
          followUpAt: clientInteractions.followUpAt,
          createdAt: clientInteractions.createdAt,
          userName: users.name,
        })
        .from(clientInteractions)
        .leftJoin(users, eq(clientInteractions.userId, users.id))
        .where(eq(clientInteractions.clientId, clientId))
        .orderBy(desc(clientInteractions.createdAt)),
      getDb()
        .select({
          id: leads.id,
          title: leads.title,
          status: leads.status,
          valueCents: leads.valueCents,
          expectedCloseDate: leads.expectedCloseDate,
          stageName: crmStages.name,
        })
        .from(leads)
        .leftJoin(crmStages, eq(leads.stageId, crmStages.id))
        .where(eq(leads.clientId, clientId))
        .orderBy(desc(leads.createdAt)),
      getDb()
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          dueDate: invoices.dueDate,
          totalCents: invoices.totalCents,
          paidCents: sql<number>`coalesce(sum(${paymentRecords.amountCents}), 0)::int`,
        })
        .from(invoices)
        .leftJoin(paymentRecords, eq(paymentRecords.invoiceId, invoices.id))
        .where(eq(invoices.clientId, clientId))
        .groupBy(invoices.id)
        .orderBy(desc(invoices.createdAt)),
      getDb()
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.clientId, clientId))
        .orderBy(desc(notificationLogs.createdAt)),
    ]);

  return {
    client: clientRows[0],
    contacts,
    interactions,
    leads: leadRows,
    invoices: invoiceRows,
    notifications: notificationRows,
  };
}
