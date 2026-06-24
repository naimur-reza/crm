import "dotenv/config";

import { hash } from "@node-rs/argon2";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import {
  attendanceRecords,
  chatGroupMembers,
  chatGroups,
  clientContacts,
  clientInteractions,
  clients,
  crmPipelines,
  crmStages,
  departments,
  employees,
  expenseCategories,
  invoiceItems,
  invoices,
  leadActivities,
  leadContacts,
  leads,
  notificationLogs,
  notificationTemplates,
  paymentRecords,
  roles,
  tasks,
  userRoles,
  users,
} from "@/lib/db/schema";

function renderTemplate(template: string, values: Record<string, string | number | null | undefined>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) =>
    String(values[key] ?? ""),
  );
}

function buildWhatsAppLink(phone: string, message: string) {
  const normalizedPhone = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

const roleSeed = [
  ["admin", "Admin", "Full access to the application."],
  ["hr", "HR", "Employee, attendance, and user operations."],
  ["manager", "Manager", "Team, task, and client oversight."],
  ["employee", "Employee", "Own attendance and assigned work."],
  ["sales", "Sales", "Client and sales task operations."],
] as const;

const stageSeed = [
  ["New", 10, 5, "slate", false, false],
  ["Contacted", 20, 15, "blue", false, false],
  ["Qualified", 30, 35, "purple", false, false],
  ["Proposal", 40, 55, "amber", false, false],
  ["Won", 60, 100, "green", true, false],
  ["Lost", 70, 0, "red", false, true],
] as const;

const templateSeed = [
  [
    "invoice_reminder",
    "Invoice reminder",
    "Hello {client_name}, this is a reminder for invoice {invoice_number}. Total due: {invoice_total}. Due date: {due_date}. Thank you, {company_name}.",
  ],
  [
    "proposal_follow_up",
    "Proposal follow-up",
    "Hello {client_name}, following up on our proposal for {lead_name}. Please let us know if you have any questions. - {company_name}",
  ],
  [
    "payment_received",
    "Payment received",
    "Hello {client_name}, thank you. We have recorded your payment for invoice {invoice_number}. - {company_name}",
  ],
] as const;

const today = new Date();
const isoDate = (offsetDays = 0) => {
  const date = new Date(today);
  date.setDate(today.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};
const atHour = (hour: number, minute = 0, offsetDays = 0) => {
  const date = new Date(`${isoDate(offsetDays)}T00:00:00`);
  date.setHours(hour, minute, 0, 0);
  return date;
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const passwordHash = await hash(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!", {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  for (const [name, label, description] of roleSeed) {
    await db
      .insert(roles)
      .values({ name, label, description })
      .onConflictDoUpdate({ target: roles.name, set: { label, description } });
  }

  const roleRows = await db.select({ id: roles.id, name: roles.name }).from(roles);
  const roleId = (name: string) => {
    const role = roleRows.find((row) => row.name === name);
    if (!role) throw new Error(`Missing role: ${name}`);
    return role.id;
  };

  const demoUsers = [
    [process.env.SEED_ADMIN_EMAIL ?? "admin@company.test", process.env.SEED_ADMIN_NAME ?? "System Admin", "admin"],
    ["hr@company.test", "Nusrat Rahman", "hr"],
    ["manager@company.test", "Arif Chowdhury", "manager"],
    ["sales@company.test", "Maya Karim", "sales"],
    ["employee@company.test", "Tanvir Hasan", "employee"],
  ] as const;

  const userIds: Record<string, string> = {};
  for (const [email, name, roleName] of demoUsers) {
    const [user] = await db
      .insert(users)
      .values({ email, name, passwordHash, status: "active" })
      .onConflictDoUpdate({
        target: users.email,
        set: { name, status: "active", updatedAt: new Date() },
      })
      .returning({ id: users.id });
    userIds[email] = user.id;
    await db
      .insert(userRoles)
      .values({ userId: user.id, roleId: roleId(roleName) })
      .onConflictDoNothing();
  }

  const [pipeline] = await db
    .insert(crmPipelines)
    .values({ name: "Default Sales Pipeline", isDefault: true })
    .onConflictDoUpdate({
      target: crmPipelines.name,
      set: { isDefault: true, updatedAt: new Date() },
    })
    .returning({ id: crmPipelines.id });

  for (const [name, sortOrder, probability, color, isWon, isLost] of stageSeed) {
    await db
      .insert(crmStages)
      .values({ pipelineId: pipeline.id, name, sortOrder, probability, color, isWon, isLost })
      .onConflictDoNothing();
  }
  const stageRows = await db.select().from(crmStages).where(eq(crmStages.pipelineId, pipeline.id));
  const stageId = (name: string) => {
    const stage = stageRows.find((row) => row.name === name);
    if (!stage) throw new Error(`Missing CRM stage: ${name}`);
    return stage.id;
  };

  for (const [key, name, body] of templateSeed) {
    await db
      .insert(notificationTemplates)
      .values({ key, name, body })
      .onConflictDoUpdate({
        target: notificationTemplates.key,
        set: { name, body, updatedAt: new Date() },
      });
  }

  const departmentSeed = [
    ["Operations", "Daily business operations and delivery."],
    ["Sales", "Lead generation, CRM, and client communication."],
    ["HR", "People operations and attendance."],
    ["Finance", "Invoices, payments, and reporting."],
  ] as const;
  const departmentIds: Record<string, string> = {};
  for (const [name, description] of departmentSeed) {
    const [department] = await db
      .insert(departments)
      .values({ name, description })
      .onConflictDoUpdate({ target: departments.name, set: { description, updatedAt: new Date() } })
      .returning({ id: departments.id });
    departmentIds[name] = department.id;
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@company.test";
  const adminName = process.env.SEED_ADMIN_NAME ?? "System Admin";
  const adminDept = departmentIds["Operations"] ?? Object.values(departmentIds)[0];

  const employeeSeed = [
    [adminName, adminEmail, "+8801711001000", "CEO", "Operations", adminEmail],
    ["Nusrat Rahman", "nusrat@company.test", "+8801711001001", "HR Manager", "HR", "hr@company.test"],
    ["Arif Chowdhury", "arif@company.test", "+8801711001002", "Operations Manager", "Operations", "manager@company.test"],
    ["Maya Karim", "maya@company.test", "+8801711001003", "Sales Lead", "Sales", "sales@company.test"],
    ["Tanvir Hasan", "tanvir@company.test", "+8801711001004", "Support Executive", "Operations", "employee@company.test"],
    ["Rafi Ahmed", "rafi@company.test", "+8801711001005", "Finance Officer", "Finance", ""],
  ] as const;
  const employeeIds: Record<string, string> = {};
  for (const [fullName, email, phone, designation, department, userEmail] of employeeSeed) {
    const [employee] = await db
      .insert(employees)
      .values({
        fullName,
        email,
        phone,
        designation,
        departmentId: departmentIds[department],
        userId: userEmail ? userIds[userEmail] : null,
        joiningDate: "2025-01-15",
        status: "active",
      })
      .onConflictDoUpdate({
        target: employees.email,
        set: { fullName, phone, designation, departmentId: departmentIds[department], updatedAt: new Date() },
      })
      .returning({ id: employees.id });
    employeeIds[fullName] = employee.id;
  }

  const clientSeed = [
    ["Northstar Retail Ltd.", "active", "Referral", "https://northstar.example", employeeIds["Maya Karim"]],
    ["BluePeak Logistics", "active", "LinkedIn", "https://bluepeak.example", employeeIds["Arif Chowdhury"]],
    ["UrbanNest Properties", "lead", "Website", "https://urbannest.example", employeeIds["Maya Karim"]],
  ] as const;
  const clientIds: Record<string, string> = {};
  for (const [name, status, source, website, ownerEmployeeId] of clientSeed) {
    const [existing] = await db.select({ id: clients.id }).from(clients).where(eq(clients.name, name)).limit(1);
    const client =
      existing ??
      (
        await db
          .insert(clients)
          .values({
            name,
            status,
            source,
            website,
            ownerEmployeeId,
            notes: "Seeded CRM account for realistic demo data.",
          })
          .returning({ id: clients.id })
      )[0];
    clientIds[name] = client.id;
  }

  const contactSeed = [
    [clientIds["Northstar Retail Ltd."], "Sadia Islam", "Operations Director", "sadia@northstar.example", "+8801712002001"],
    [clientIds["BluePeak Logistics"], "Imran Hossain", "Managing Partner", "imran@bluepeak.example", "+8801712002002"],
    [clientIds["UrbanNest Properties"], "Farhana Akter", "Marketing Head", "farhana@urbannest.example", "+8801712002003"],
  ] as const;
  for (const [clientId, name, title, email, phone] of contactSeed) {
    const [existing] = await db
      .select({ id: clientContacts.id })
      .from(clientContacts)
      .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.email, email)))
      .limit(1);
    if (!existing) {
      await db.insert(clientContacts).values({ clientId, name, title, email, phone, isPrimary: true });
    }
  }

  const interactionSeed = [
    [clientIds["Northstar Retail Ltd."], "meeting", "Quarterly planning meeting completed; invoice follow-up scheduled."],
    [clientIds["BluePeak Logistics"], "call", "Discussed dispatch dashboard and payment timeline."],
    [clientIds["UrbanNest Properties"], "email", "Sent service overview and requested budget confirmation."],
  ] as const;
  for (const [clientId, type, summary] of interactionSeed) {
    const [existing] = await db
      .select({ id: clientInteractions.id })
      .from(clientInteractions)
      .where(and(eq(clientInteractions.clientId, clientId), eq(clientInteractions.summary, summary)))
      .limit(1);
    if (!existing) await db.insert(clientInteractions).values({ clientId, type, summary, userId: userIds["sales@company.test"] });
  }

  const attendanceSeed = [
    ["Nusrat Rahman", "present", 9, 18],
    ["Arif Chowdhury", "present", 9, 18],
    ["Maya Karim", "late", 10, 18],
    ["Tanvir Hasan", "present", 8, 17],
    ["Rafi Ahmed", "half_day", 9, 13],
  ] as const;
  for (const [employeeName, status, inHour, outHour] of attendanceSeed) {
    await db
      .insert(attendanceRecords)
      .values({
        employeeId: employeeIds[employeeName],
        attendanceDate: isoDate(),
        checkInAt: atHour(inHour, status === "late" ? 20 : 5),
        checkOutAt: atHour(outHour, 10),
        status,
        source: "manual",
        notes: status === "late" ? "Traffic delay reported." : "Seeded attendance record.",
      })
      .onConflictDoUpdate({
        target: [attendanceRecords.employeeId, attendanceRecords.attendanceDate],
        set: { status, checkInAt: atHour(inHour), checkOutAt: atHour(outHour), updatedAt: new Date() },
      });
  }

  const taskSeed = [
    ["Prepare Northstar renewal proposal", "high", "in_progress", employeeIds["Maya Karim"], clientIds["Northstar Retail Ltd."], isoDate(3)],
    ["Reconcile May invoice payments", "urgent", "todo", employeeIds["Rafi Ahmed"], clientIds["BluePeak Logistics"], isoDate(2)],
    ["Update employee attendance exceptions", "medium", "review", employeeIds["Nusrat Rahman"], null, isoDate(1)],
  ] as const;
  for (const [title, priority, status, assigneeEmployeeId, clientId, dueDate] of taskSeed) {
    const [existing] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.title, title)).limit(1);
    if (!existing) {
      await db.insert(tasks).values({
        title,
        priority,
        status,
        assigneeEmployeeId,
        clientId,
        dueDate,
        creatorUserId: userIds["manager@company.test"],
        description: "Seeded task representing a realistic company workflow.",
      });
    }
  }

  const leadSeed = [
    ["ERP implementation for UrbanNest", "UrbanNest Properties", "Website", "Proposal", 1850000, employeeIds["Maya Karim"], isoDate(12)],
    ["Warehouse CRM rollout", "BluePeak Logistics", "Referral", "Proposal", 3200000, employeeIds["Arif Chowdhury"], isoDate(8)],
    ["Retail support automation", "Northstar Retail Ltd.", "Existing client", "Won", 2400000, employeeIds["Maya Karim"], isoDate(-2)],
    ["Payroll portal inquiry", "Delta Manufacturing", "Facebook", "Contacted", 950000, employeeIds["Maya Karim"], isoDate(20)],
  ] as const;
  const leadIds: Record<string, string> = {};
  for (const [title, companyName, source, stageName, valueCents, ownerEmployeeId, expectedCloseDate] of leadSeed) {
    const [existing] = await db.select({ id: leads.id }).from(leads).where(eq(leads.title, title)).limit(1);
    const lead =
      existing ??
      (
        await db
          .insert(leads)
          .values({
            pipelineId: pipeline.id,
            stageId: stageId(stageName),
            title,
            companyName,
            source,
            status: stageName === "Won" ? "won" : "open",
            valueCents,
            ownerEmployeeId,
            expectedCloseDate,
            clientId: clientIds[companyName] ?? null,
            notes: "Seeded opportunity with timeline, contact, and invoice context.",
          })
          .returning({ id: leads.id })
      )[0];
    leadIds[title] = lead.id;
  }

  const leadContactSeed = [
    [leadIds["ERP implementation for UrbanNest"], "Farhana Akter", "Marketing Head", "farhana@urbannest.example", "+8801712002003"],
    [leadIds["Warehouse CRM rollout"], "Imran Hossain", "Managing Partner", "imran@bluepeak.example", "+8801712002002"],
    [leadIds["Payroll portal inquiry"], "Mahmud Alam", "HR Director", "mahmud@delta.example", "+8801712002004"],
  ] as const;
  for (const [leadId, name, title, email, whatsappNumber] of leadContactSeed) {
    const [existing] = await db
      .select({ id: leadContacts.id })
      .from(leadContacts)
      .where(and(eq(leadContacts.leadId, leadId), eq(leadContacts.email, email)))
      .limit(1);
    if (!existing) {
      await db.insert(leadContacts).values({ leadId, name, title, email, whatsappNumber, phone: whatsappNumber, isPrimary: true });
    }
  }

  const leadActivitySeed = [
    [leadIds["ERP implementation for UrbanNest"], "meeting", "Discovery meeting completed; proposal requested by next week."],
    [leadIds["Warehouse CRM rollout"], "whatsapp", "Shared revised quote and deployment timeline over WhatsApp."],
    [leadIds["Payroll portal inquiry"], "call", "Initial qualification call completed; waiting for employee count."],
  ] as const;
  for (const [leadId, type, summary] of leadActivitySeed) {
    const [existing] = await db
      .select({ id: leadActivities.id })
      .from(leadActivities)
      .where(and(eq(leadActivities.leadId, leadId), eq(leadActivities.summary, summary)))
      .limit(1);
    if (!existing) await db.insert(leadActivities).values({ leadId, type, summary, userId: userIds["sales@company.test"] });
  }

  const invoiceSeed = [
    ["INV-DEMO-1001", leadIds["Retail support automation"], clientIds["Northstar Retail Ltd."], "2026-05-01", "2026-05-15", "CRM support retainer", 1, 2400000, "paid"],
    ["INV-DEMO-1002", leadIds["Warehouse CRM rollout"], clientIds["BluePeak Logistics"], "2026-05-10", "2026-05-30", "Warehouse CRM phase one", 1, 3200000, "partially_paid"],
    ["INV-DEMO-1003", leadIds["ERP implementation for UrbanNest"], clientIds["UrbanNest Properties"], "2026-05-18", "2026-06-01", "ERP discovery and proposal", 1, 1850000, "sent"],
  ] as const;
  const invoiceIds: Record<string, string> = {};
  for (const [invoiceNumber, leadId, clientId, issueDate, dueDate, description, quantity, totalCents, status] of invoiceSeed) {
    const [invoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber,
        leadId,
        clientId,
        issueDate,
        dueDate,
        subtotalCents: totalCents,
        totalCents,
        status,
        sentAt: new Date(),
        notes: "Seeded invoice for manual payment tracking.",
      })
      .onConflictDoUpdate({
        target: invoices.invoiceNumber,
        set: { status, totalCents, subtotalCents: totalCents, updatedAt: new Date() },
      })
      .returning({ id: invoices.id });
    invoiceIds[invoiceNumber] = invoice.id;
    const [existingItem] = await db
      .select({ id: invoiceItems.id })
      .from(invoiceItems)
      .where(and(eq(invoiceItems.invoiceId, invoice.id), eq(invoiceItems.description, description)))
      .limit(1);
    if (!existingItem) {
      await db.insert(invoiceItems).values({
        invoiceId: invoice.id,
        description,
        quantity,
        unitPriceCents: totalCents,
        totalCents,
      });
    }
  }

  const paymentSeed = [
    [invoiceIds["INV-DEMO-1001"], 2400000, "2026-05-12", "Bank transfer", "BANK-NORTHSTAR-001", "Full payment received."],
    [invoiceIds["INV-DEMO-1002"], 1200000, "2026-05-18", "Cheque", "CHQ-BLUEPEAK-221", "Advance payment recorded."],
  ] as const;
  for (const [invoiceId, amountCents, paymentDate, method, reference, notes] of paymentSeed) {
    const [existing] = await db.select({ id: paymentRecords.id }).from(paymentRecords).where(eq(paymentRecords.reference, reference)).limit(1);
    if (!existing) {
      await db.insert(paymentRecords).values({
        invoiceId,
        amountCents,
        paymentDate,
        method,
        reference,
        notes,
        createdByUserId: userIds["admin@company.test"] ?? userIds[process.env.SEED_ADMIN_EMAIL ?? "admin@company.test"],
      });
    }
  }

  const [invoiceReminder] = await db
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.key, "invoice_reminder"))
    .limit(1);
  if (invoiceReminder) {
    const message = renderTemplate(invoiceReminder.body, {
      client_name: "BluePeak Logistics",
      invoice_number: "INV-DEMO-1002",
      invoice_total: "TK 32,000.00",
      due_date: "2026-05-30",
      company_name: "Company Tools",
    });
    const waLink = buildWhatsAppLink("+8801712002002", message);
    const [existing] = await db
      .select({ id: notificationLogs.id })
      .from(notificationLogs)
      .where(and(eq(notificationLogs.recipientPhone, "+8801712002002"), eq(notificationLogs.message, message)))
      .limit(1);
    if (!existing) {
      await db.insert(notificationLogs).values({
        templateId: invoiceReminder.id,
        leadId: leadIds["Warehouse CRM rollout"],
        clientId: clientIds["BluePeak Logistics"],
        invoiceId: invoiceIds["INV-DEMO-1002"],
        recipientName: "Imran Hossain",
        recipientPhone: "+8801712002002",
        message,
        waLink,
        actorUserId: userIds["sales@company.test"],
      });
    }
  }

  const teamGroupName = "Team Chat";
  const [existingTeamGroup] = await db
    .select({ id: chatGroups.id })
    .from(chatGroups)
    .where(eq(chatGroups.name, teamGroupName))
    .limit(1);

  let teamGroupId: string;
  if (existingTeamGroup) {
    teamGroupId = existingTeamGroup.id;
  } else {
    const [group] = await db
      .insert(chatGroups)
      .values({ name: teamGroupName, description: "General team discussion.", type: "team", createdBy: userIds["admin@company.test"] })
      .returning({ id: chatGroups.id });
    teamGroupId = group.id;
  }

  const existingMembers = await db
    .select({ userId: chatGroupMembers.userId })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.groupId, teamGroupId));

  const existingMemberIds = new Set(existingMembers.map((m) => m.userId));
  const allUserIds = Object.values(userIds).filter((id) => !existingMemberIds.has(id));

  if (allUserIds.length > 0) {
    await db.insert(chatGroupMembers).values(
      allUserIds.map((uid) => ({ groupId: teamGroupId, userId: uid, role: "member" })),
    );
  }

  // Seed default expense categories
  const defaultCategories: {
    name: string;
    type: "travel" | "office_supplies" | "meals" | "utilities" | "software" | "transportation" | "accommodation" | "entertainment" | "other";
    description: string;
  }[] = [
    { name: "Travel", type: "travel", description: "Airfare, train, bus, and other travel costs" },
    { name: "Office Supplies", type: "office_supplies", description: "Stationery, printer supplies, and office consumables" },
    { name: "Meals", type: "meals", description: "Business meals with clients or team" },
    { name: "Utilities", type: "utilities", description: "Internet, phone, electricity, and other utility bills" },
    { name: "Software", type: "software", description: "Software licenses, subscriptions, and SaaS tools" },
    { name: "Transportation", type: "transportation", description: "Local transport, fuel, parking, and tolls" },
    { name: "Accommodation", type: "accommodation", description: "Hotel and lodging expenses" },
    { name: "Entertainment", type: "entertainment", description: "Client entertainment and team building" },
    { name: "Other", type: "other", description: "Miscellaneous expenses" },
  ];
  for (const cat of defaultCategories) {
    const existing = await db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(eq(expenseCategories.name, cat.name))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(expenseCategories).values(cat);
    }
  }

  console.log("Seeded realistic company, HR, task, client, CRM, invoice, payment, WhatsApp, chat, and expense demo data.");
  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
