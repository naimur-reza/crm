import "server-only";

import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  employees,
  invoiceItems,
  invoices,
  leads,
  paymentRecords,
  workOrders,
} from "@/lib/db/schema";

export async function getWorkOrderList(filters?: {
  status?: string;
  search?: string;
}) {
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(workOrders.status, filters.status as "pending" | "in_progress" | "completed" | "cancelled"));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(workOrders.workOrderNumber, `%${filters.search}%`),
        like(workOrders.title, `%${filters.search}%`),
        like(leads.title, `%${filters.search}%`),
        like(clients.name, `%${filters.search}%`),
      ),
    );
  }

  return getDb()
    .select({
      id: workOrders.id,
      workOrderNumber: workOrders.workOrderNumber,
      title: workOrders.title,
      status: workOrders.status,
      totalValueCents: workOrders.totalValueCents,
      createdAt: workOrders.createdAt,
      leadTitle: leads.title,
      leadCompanyName: leads.companyName,
      clientName: clients.name,
      ownerName: employees.fullName,
    })
    .from(workOrders)
    .leftJoin(leads, eq(workOrders.leadId, leads.id))
    .leftJoin(clients, eq(workOrders.clientId, clients.id))
    .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(workOrders.createdAt));
}

export async function getWorkOrderDetail(workOrderId: string) {
  const [workOrderRows, invoiceRows] = await Promise.all([
    getDb()
      .select({
        id: workOrders.id,
        workOrderNumber: workOrders.workOrderNumber,
        title: workOrders.title,
        status: workOrders.status,
        totalValueCents: workOrders.totalValueCents,
        notes: workOrders.notes,
        createdAt: workOrders.createdAt,
        updatedAt: workOrders.updatedAt,
        leadId: workOrders.leadId,
        leadTitle: leads.title,
        leadCompanyName: leads.companyName,
        leadStatus: leads.status,
        clientId: workOrders.clientId,
        clientName: clients.name,
        ownerName: employees.fullName,
      })
      .from(workOrders)
      .leftJoin(leads, eq(workOrders.leadId, leads.id))
      .leftJoin(clients, eq(workOrders.clientId, clients.id))
      .leftJoin(employees, eq(leads.ownerEmployeeId, employees.id))
      .where(eq(workOrders.id, workOrderId))
      .limit(1),
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
      .where(eq(invoices.workOrderId, workOrderId))
      .groupBy(invoices.id)
      .orderBy(desc(invoices.createdAt)),
  ]);

  return {
    workOrder: workOrderRows[0],
    invoices: invoiceRows,
  };
}

export async function generateWorkOrderNumber(): Promise<string> {
  const now = new Date();
  const prefix = `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(workOrders)
    .where(sql`work_order_number LIKE ${prefix + "%"}`);
  return `${prefix}${String((row?.count ?? 0) + 1).padStart(4, "0")}`;
}
