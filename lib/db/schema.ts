import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "inactive",
  "on_leave",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "late",
  "absent",
  "half_day",
]);
export const attendanceSourceEnum = pgEnum("attendance_source", [
  "manual",
  "admin",
  "import",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "review",
  "done",
  "blocked",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const clientStatusEnum = pgEnum("client_status", [
  "lead",
  "active",
  "paused",
  "closed",
]);
export const interactionTypeEnum = pgEnum("interaction_type", [
  "call",
  "email",
  "meeting",
  "note",
]);
export const leadStatusEnum = pgEnum("lead_status", ["open", "won", "lost"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "email",
  "meeting",
  "note",
  "whatsapp",
  "follow_up",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]);
export const notificationChannelEnum = pgEnum("notification_channel", ["whatsapp"]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "generated",
  "sent",
  "failed",
]);
export const workOrderStatusEnum = pgEnum("work_order_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: userStatusEnum("status").default("active").notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    roleId: uuid("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [uniqueIndex("user_roles_unique_idx").on(table.userId, table.roleId)],
);

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  ...timestamps,
});

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    designation: text("designation").notNull(),
    joiningDate: date("joining_date"),
    status: employeeStatusEnum("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("employees_email_idx").on(table.email),
    index("employees_status_idx").on(table.status),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    ownerEmployeeId: uuid("owner_employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    status: clientStatusEnum("status").default("lead").notNull(),
    source: text("source"),
    website: text("website"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("clients_owner_idx").on(table.ownerEmployeeId),
    index("clients_status_idx").on(table.status),
  ],
);

export const clientContacts = pgTable(
  "client_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    title: text("title"),
    email: text("email"),
    phone: text("phone"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...timestamps,
  },
  (table) => [index("client_contacts_client_idx").on(table.clientId)],
);

export const clientInteractions = pgTable(
  "client_interactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: interactionTypeEnum("type").default("note").notNull(),
    summary: text("summary").notNull(),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("client_interactions_client_idx").on(table.clientId)],
);

export const crmPipelines = pgTable("crm_pipelines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
});

export const crmStages = pgTable(
  "crm_stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineId: uuid("pipeline_id")
      .references(() => crmPipelines.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    probability: integer("probability").default(0).notNull(),
    color: text("color").default("slate").notNull(),
    isWon: boolean("is_won").default(false).notNull(),
    isLost: boolean("is_lost").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("crm_stages_pipeline_order_idx").on(table.pipelineId, table.sortOrder),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineId: uuid("pipeline_id").references(() => crmPipelines.id, {
      onDelete: "set null",
    }),
    stageId: uuid("stage_id").references(() => crmStages.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    ownerEmployeeId: uuid("owner_employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    companyName: text("company_name"),
    source: text("source"),
    status: leadStatusEnum("status").default("open").notNull(),
    valueCents: integer("value_cents").default(0).notNull(),
    expectedCloseDate: date("expected_close_date"),
    lostReason: text("lost_reason"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("leads_stage_idx").on(table.stageId),
    index("leads_owner_idx").on(table.ownerEmployeeId),
    index("leads_status_idx").on(table.status),
  ],
);

export const leadContacts = pgTable(
  "lead_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    title: text("title"),
    email: text("email"),
    phone: text("phone"),
    whatsappNumber: text("whatsapp_number"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    ...timestamps,
  },
  (table) => [index("lead_contacts_lead_idx").on(table.leadId)],
);

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: activityTypeEnum("type").default("note").notNull(),
    summary: text("summary").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("lead_activities_lead_idx").on(table.leadId)],
);

export const leadStageHistory = pgTable(
  "lead_stage_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .references(() => leads.id, { onDelete: "cascade" })
      .notNull(),
    fromStageId: uuid("from_stage_id").references(() => crmStages.id, {
      onDelete: "set null",
    }),
    toStageId: uuid("to_stage_id").references(() => crmStages.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("lead_stage_history_lead_idx").on(table.leadId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceNumber: text("invoice_number").notNull(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    workOrderId: uuid("work_order_id").references(() => workOrders.id, {
      onDelete: "set null",
    }),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    subtotalCents: integer("subtotal_cents").default(0).notNull(),
    discountCents: integer("discount_cents").default(0).notNull(),
    taxCents: integer("tax_cents").default(0).notNull(),
    totalCents: integer("total_cents").default(0).notNull(),
    notes: text("notes"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("invoices_number_idx").on(table.invoiceNumber),
    index("invoices_status_idx").on(table.status),
    index("invoices_lead_idx").on(table.leadId),
    index("invoices_work_order_idx").on(table.workOrderId),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .references(() => invoices.id, { onDelete: "cascade" })
      .notNull(),
    description: text("description").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    unitPriceCents: integer("unit_price_cents").default(0).notNull(),
    totalCents: integer("total_cents").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("invoice_items_invoice_idx").on(table.invoiceId)],
);

export const paymentRecords = pgTable(
  "payment_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .references(() => invoices.id, { onDelete: "cascade" })
      .notNull(),
    amountCents: integer("amount_cents").notNull(),
    paymentDate: date("payment_date").notNull(),
    method: text("method").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("payment_records_invoice_idx").on(table.invoiceId)],
);

export const notificationTemplates = pgTable(
  "notification_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    channel: notificationChannelEnum("channel").default("whatsapp").notNull(),
    body: text("body").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("notification_templates_key_idx").on(table.key)],
);

export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id").references(() => notificationTemplates.id, {
      onDelete: "set null",
    }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    channel: notificationChannelEnum("channel").default("whatsapp").notNull(),
    status: notificationStatusEnum("status").default("generated").notNull(),
    recipientName: text("recipient_name"),
    recipientPhone: text("recipient_phone"),
    message: text("message").notNull(),
    waLink: text("wa_link"),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notification_logs_lead_idx").on(table.leadId),
    index("notification_logs_invoice_idx").on(table.invoiceId),
  ],
);

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workOrderNumber: text("work_order_number").notNull(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    status: workOrderStatusEnum("status").default("pending").notNull(),
    totalValueCents: integer("total_value_cents").default(0).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("work_orders_number_idx").on(table.workOrderNumber),
    index("work_orders_lead_idx").on(table.leadId),
    index("work_orders_status_idx").on(table.status),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    dueDate: date("due_date"),
    creatorUserId: uuid("creator_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assigneeEmployeeId: uuid("assignee_employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    index("tasks_assignee_idx").on(table.assigneeEmployeeId),
    index("tasks_status_idx").on(table.status),
  ],
);

export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("task_comments_task_idx").on(table.taskId)],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    attendanceDate: date("attendance_date").notNull(),
    checkInAt: timestamp("check_in_at", { withTimezone: true }),
    checkOutAt: timestamp("check_out_at", { withTimezone: true }),
    status: attendanceStatusEnum("status").default("present").notNull(),
    source: attendanceSourceEnum("source").default("manual").notNull(),
    notes: text("notes"),
    correctedByUserId: uuid("corrected_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    correctedAt: timestamp("corrected_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("attendance_employee_date_idx").on(
      table.employeeId,
      table.attendanceDate,
    ),
    index("attendance_date_idx").on(table.attendanceDate),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_logs_actor_idx").on(table.actorUserId)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id")
      .references(() => users.id, { onDelete: "set null" })
      .notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("chat_messages_created_at_idx").on(table.createdAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  attendanceRecords: many(attendanceRecords),
  tasks: many(tasks),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  owner: one(employees, {
    fields: [clients.ownerEmployeeId],
    references: [employees.id],
  }),
  contacts: many(clientContacts),
  interactions: many(clientInteractions),
  tasks: many(tasks),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  lead: one(leads, { fields: [workOrders.leadId], references: [leads.id] }),
  client: one(clients, { fields: [workOrders.clientId], references: [clients.id] }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  lead: one(leads, { fields: [invoices.leadId], references: [leads.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  workOrder: one(workOrders, { fields: [invoices.workOrderId], references: [workOrders.id] }),
  items: many(invoiceItems),
  payments: many(paymentRecords),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  pipeline: one(crmPipelines, { fields: [leads.pipelineId], references: [crmPipelines.id] }),
  stage: one(crmStages, { fields: [leads.stageId], references: [crmStages.id] }),
  client: one(clients, { fields: [leads.clientId], references: [clients.id] }),
  owner: one(employees, {
    fields: [leads.ownerEmployeeId],
    references: [employees.id],
  }),
  contacts: many(leadContacts),
  activities: many(leadActivities),
  invoices: many(invoices),
  workOrders: many(workOrders),
}));
