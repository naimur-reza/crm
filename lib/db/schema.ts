import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
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

export const leaveTypeEnum = pgEnum("leave_type", ["sick", "casual", "annual", "unpaid", "other"]);
export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected", "cancelled"]);

export const payrollPeriodStatusEnum = pgEnum("payroll_period_status", ["draft", "completed", "cancelled"]);
export const payrollRunStatusEnum = pgEnum("payroll_run_status", ["pending", "paid", "failed"]);
export const deductionCategoryEnum = pgEnum("deduction_category", ["tax", "insurance", "loan", "other"]);

export const chatGroupTypeEnum = pgEnum("chat_group_type", ["team", "group", "direct"]);

export const expenseClaimStatusEnum = pgEnum("expense_claim_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "reimbursed",
]);
export const expenseCategoryTypeEnum = pgEnum("expense_category_type", [
  "travel",
  "office_supplies",
  "meals",
  "utilities",
  "software",
  "transportation",
  "accommodation",
  "entertainment",
  "other",
]);

export const chatGroups = pgTable(
  "chat_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    type: chatGroupTypeEnum("type").default("group").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chat_groups_type_idx").on(table.type),
  ],
);

export const chatGroupMembers = pgTable(
  "chat_group_members",
  {
    groupId: uuid("group_id")
      .references(() => chatGroups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.userId] }),
  }),
);

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
    avatarUrl: text("avatar_url"),
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

export const userPermissions = pgTable(
  "user_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    permission: text("permission").notNull(),
    grantedBy: uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_permissions_unique_idx").on(table.userId, table.permission)],
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
      sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("tasks_assignee_idx").on(table.assigneeEmployeeId),
    index("tasks_status_idx").on(table.status),
    index("tasks_sort_order_idx").on(table.sortOrder),
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
    index("attendance_date_employee_status_idx").on(
      table.attendanceDate,
      table.employeeId,
      table.status,
    ),
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

export const chatMessageTypeEnum = pgEnum("chat_message_type", ["user", "system"]);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id")
      .references(() => users.id, { onDelete: "set null" })
      .notNull(),
    groupId: uuid("group_id")
      .references(() => chatGroups.id, { onDelete: "cascade" }),
    type: chatMessageTypeEnum("type").default("user").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_group_id_idx").on(table.groupId, table.createdAt),
    index("chat_messages_sender_id_idx").on(table.senderId),
  ],
);

export const chatMessageReads = pgTable(
  "chat_message_reads",
  {
    messageId: uuid("message_id")
      .references(() => chatMessages.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.userId] }),
    userIdIdx: index("chat_message_reads_user_id_idx").on(table.userId),
  }),
);

export const chatTypingStatus = pgTable(
  "chat_typing_status",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    groupId: uuid("group_id")
      .references(() => chatGroups.id, { onDelete: "cascade" })
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.groupId] }),
    groupIdIdx: index("chat_typing_status_group_id_idx").on(table.groupId),
    updatedAtIdx: index("chat_typing_status_updated_at_idx").on(table.updatedAt),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    groupId: uuid("group_id").references(() => chatGroups.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_user_unread_idx").on(table.userId, table.readAt),
    index("notifications_created_at_idx").on(table.createdAt),
  ],
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    leaveType: leaveTypeEnum("leave_type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason").notNull(),
    status: leaveStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("leave_requests_employee_idx").on(table.employeeId),
    index("leave_requests_status_idx").on(table.status),
    index("leave_requests_employee_status_created_idx").on(
      table.employeeId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const leaveBalances = pgTable(
  "leave_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    year: integer("year").notNull(),
    leaveType: leaveTypeEnum("leave_type").notNull(),
    totalDays: integer("total_days").default(0).notNull(),
    usedDays: integer("used_days").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("leave_balances_employee_year_type_idx").on(table.employeeId, table.year, table.leaveType),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  userRoles: many(userRoles),
  userPermissions: many(userPermissions),
  chatGroupMembers: many(chatGroupMembers),
  chatMessages: many(chatMessages),
  notifications: many(notifications, { relationName: "notifications" }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, { fields: [userPermissions.userId], references: [users.id] }),
  grantor: one(users, { fields: [userPermissions.grantedBy], references: [users.id] }),
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
  leaveRequests: many(leaveRequests),
  expenseClaims: many(expenseClaims),
  salaryStructures: many(salaryStructures),
  employeeDeductions: many(employeeDeductions),
  bankDetails: many(employeeBankDetails),
  payrollRuns: many(payrollRuns),
  payslips: many(payslips),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, { fields: [leaveRequests.employeeId], references: [employees.id] }),
  reviewer: one(users, { fields: [leaveRequests.reviewedBy], references: [users.id] }),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  employee: one(employees, { fields: [leaveBalances.employeeId], references: [employees.id] }),
}));

export const salaryStructures = pgTable(
  "salary_structures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    basicSalaryCents: integer("basic_salary_cents").default(0).notNull(),
    housingAllowanceCents: integer("housing_allowance_cents").default(0).notNull(),
    transportAllowanceCents: integer("transport_allowance_cents").default(0).notNull(),
    medicalAllowanceCents: integer("medical_allowance_cents").default(0).notNull(),
    otherAllowancesCents: jsonb("other_allowances_cents").default({}).notNull(),
    grossSalaryCents: integer("gross_salary_cents").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("salary_structures_employee_idx").on(table.employeeId),
  ],
);

export const deductionDefinitions = pgTable(
  "deduction_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    description: text("description"),
    category: deductionCategoryEnum("category").default("other").notNull(),
    type: text("type", { enum: ["percentage", "fixed"] }).default("fixed").notNull(),
    defaultValueCents: integer("default_value_cents").default(0).notNull(),
    defaultRate: integer("default_rate").default(0).notNull(),
    isMandatory: boolean("is_mandatory").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("deduction_definitions_code_idx").on(table.code),
  ],
);

export const employeeDeductions = pgTable(
  "employee_deductions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    deductionId: uuid("deduction_id")
      .references(() => deductionDefinitions.id, { onDelete: "cascade" })
      .notNull(),
    amountCents: integer("amount_cents"),
    rate: integer("rate"),
    isPercentage: boolean("is_percentage").default(false).notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    ...timestamps,
  },
  (table) => [
    index("employee_deductions_employee_idx").on(table.employeeId),
  ],
);

export const employeeBankDetails = pgTable(
  "employee_bank_details",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    bankName: text("bank_name").notNull(),
    branchName: text("branch_name"),
    accountNumber: text("account_number").notNull(),
    accountHolderName: text("account_holder_name").notNull(),
    ifscCode: text("ifsc_code"),
    swiftCode: text("swift_code"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("employee_bank_details_employee_idx").on(table.employeeId),
  ],
);

export const payrollPeriods = pgTable(
  "payroll_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    periodName: text("period_name").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    paymentDate: date("payment_date"),
    status: payrollPeriodStatusEnum("status").default("draft").notNull(),
    processedBy: uuid("processed_by").references(() => users.id, { onDelete: "set null" }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payroll_periods_name_idx").on(table.periodName),
    index("payroll_periods_status_idx").on(table.status),
  ],
);

export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payrollPeriodId: uuid("payroll_period_id")
      .references(() => payrollPeriods.id, { onDelete: "cascade" })
      .notNull(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    grossPayCents: integer("gross_pay_cents").default(0).notNull(),
    totalDeductionsCents: integer("total_deductions_cents").default(0).notNull(),
    netPayCents: integer("net_pay_cents").default(0).notNull(),
    earningsBreakdown: jsonb("earnings_breakdown").default({}).notNull(),
    deductionsBreakdown: jsonb("deductions_breakdown").default({}).notNull(),
    attendanceSummary: jsonb("attendance_summary").default({}).notNull(),
    status: payrollRunStatusEnum("status").default("pending").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paymentMethod: text("payment_method"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payroll_runs_period_employee_idx").on(table.payrollPeriodId, table.employeeId),
    index("payroll_runs_employee_idx").on(table.employeeId),
    index("payroll_runs_status_idx").on(table.status),
  ],
);

export const payslips = pgTable(
  "payslips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payrollRunId: uuid("payroll_run_id")
      .references(() => payrollRuns.id, { onDelete: "cascade" })
      .notNull(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    pdfUrl: text("pdf_url"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
  },
  (table) => [
    index("payslips_run_idx").on(table.payrollRunId),
    index("payslips_employee_idx").on(table.employeeId),
  ],
);

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

export const chatGroupsRelations = relations(chatGroups, ({ one, many }) => ({
  createdBy: one(users, { fields: [chatGroups.createdBy], references: [users.id] }),
  members: many(chatGroupMembers),
  messages: many(chatMessages),
}));

export const chatGroupMembersRelations = relations(chatGroupMembers, ({ one }) => ({
  group: one(chatGroups, { fields: [chatGroupMembers.groupId], references: [chatGroups.id] }),
  user: one(users, { fields: [chatGroupMembers.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
  group: one(chatGroups, { fields: [chatMessages.groupId], references: [chatGroups.id] }),
  reads: many(chatMessageReads),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id], relationName: "user" }),
  actor: one(users, { fields: [notifications.actorUserId], references: [users.id] }),
  group: one(chatGroups, { fields: [notifications.groupId], references: [chatGroups.id] }),
}));

export const siteSettings = pgTable("site_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: text("company_name").default("Company").notNull(),
  logoUrl: text("logo_url"),
  officeStartTime: text("office_start_time").default("10:00").notNull(),
  gracePeriodMinutes: integer("grace_period_minutes").default(40).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leadScores = pgTable("lead_scores", {
  leadId: uuid("lead_id")
    .references(() => leads.id, { onDelete: "cascade" })
    .primaryKey(),
  score: integer("score").notNull(),
  label: text("label", { enum: ["hot", "warm", "cold"] }).notNull(),
  reasoning: text("reasoning").notNull(),
  scoredAt: timestamp("scored_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leadScoresRelations = relations(leadScores, ({ one }) => ({
  lead: one(leads, { fields: [leadScores.leadId], references: [leads.id] }),
}));

export const leadSentiments = pgTable("lead_sentiments", {
  id: uuid("id").defaultRandom().primaryKey(),
  activityId: uuid("activity_id")
    .references(() => leadActivities.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label", { enum: ["positive", "negative", "neutral", "mixed"] }).notNull(),
  score: integer("score").notNull(),
  keyPhrases: text("key_phrases").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const interactionSentiments = pgTable("interaction_sentiments", {
  id: uuid("id").defaultRandom().primaryKey(),
  interactionId: uuid("interaction_id")
    .references(() => clientInteractions.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label", { enum: ["positive", "negative", "neutral", "mixed"] }).notNull(),
  score: integer("score").notNull(),
  keyPhrases: text("key_phrases").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatSummaries = pgTable(
  "chat_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .references(() => chatGroups.id, { onDelete: "cascade" })
      .notNull(),
    summary: text("summary").notNull(),
    messageCount: integer("message_count").notNull(),
    topicTags: text("topic_tags").array(),
    actionItems: text("action_items").array(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("chat_summaries_group_idx").on(table.groupId)],
);

export const chatSummariesRelations = relations(chatSummaries, ({ one }) => ({
  group: one(chatGroups, { fields: [chatSummaries.groupId], references: [chatGroups.id] }),
}));

export const invoiceMatchSuggestions = pgTable(
  "invoice_match_suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .references(() => invoices.id, { onDelete: "cascade" })
      .notNull(),
    paymentRecordId: uuid("payment_record_id")
      .references(() => paymentRecords.id, { onDelete: "cascade" })
      .notNull(),
    confidence: integer("confidence").notNull(),
    reasoning: text("reasoning").notNull(),
    status: text("status", { enum: ["pending", "accepted", "rejected"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("invoice_match_invoice_idx").on(table.invoiceId),
    index("invoice_match_payment_idx").on(table.paymentRecordId),
  ],
);

export const invoiceMatchSuggestionsRelations = relations(invoiceMatchSuggestions, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceMatchSuggestions.invoiceId], references: [invoices.id] }),
  payment: one(paymentRecords, {
    fields: [invoiceMatchSuggestions.paymentRecordId],
    references: [paymentRecords.id],
  }),
}));

export const attendancePredictions = pgTable(
  "attendance_predictions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    predictedDate: date("predicted_date").notNull(),
    predictedStatus: text("predicted_status", {
      enum: ["present", "late", "absent", "leave"],
    }).notNull(),
    confidence: integer("confidence").notNull(),
    reasoning: text("reasoning").notNull(),
    riskFactors: text("risk_factors").array(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("attendance_predictions_employee_idx").on(table.employeeId),
    index("attendance_predictions_date_idx").on(table.predictedDate),
  ],
);

export const attendancePredictionsRelations = relations(attendancePredictions, ({ one }) => ({
  employee: one(employees, {
    fields: [attendancePredictions.employeeId],
    references: [employees.id],
  }),
}));

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    type: expenseCategoryTypeEnum("type").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("expense_categories_type_idx").on(table.type)],
);

export const expenseClaims = pgTable(
  "expense_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimNumber: text("claim_number").notNull(),
    employeeId: uuid("employee_id")
      .references(() => employees.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    totalAmountCents: integer("total_amount_cents").default(0).notNull(),
    status: expenseClaimStatusEnum("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    adminNotes: text("admin_notes"),
    reimbursedAt: timestamp("reimbursed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("expense_claims_number_idx").on(table.claimNumber),
    index("expense_claims_employee_idx").on(table.employeeId),
    index("expense_claims_status_idx").on(table.status),
    index("expense_claims_employee_status_created_idx").on(
      table.employeeId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const expenseItems = pgTable(
  "expense_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id")
      .references(() => expenseClaims.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id")
      .references(() => expenseCategories.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").default(0).notNull(),
    expenseDate: date("expense_date").notNull(),
    receiptUrl: text("receipt_url"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("expense_items_claim_idx").on(table.claimId),
    index("expense_items_category_idx").on(table.categoryId),
  ],
);

export const expenseReimbursements = pgTable(
  "expense_reimbursements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id")
      .references(() => expenseClaims.id, { onDelete: "cascade" })
      .notNull(),
    amountCents: integer("amount_cents").notNull(),
    reimbursedDate: date("reimbursed_date").notNull(),
    method: text("method").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    processedBy: uuid("processed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("expense_reimbursements_claim_idx").on(table.claimId),
  ],
);

export const expenseToInvoiceLinks = pgTable(
  "expense_to_invoice_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expenseClaimId: uuid("expense_claim_id")
      .references(() => expenseClaims.id, { onDelete: "cascade" })
      .notNull(),
    invoiceId: uuid("invoice_id")
      .references(() => invoices.id, { onDelete: "cascade" })
      .notNull(),
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("expense_to_invoice_claim_idx").on(table.expenseClaimId),
    index("expense_to_invoice_invoice_idx").on(table.invoiceId),
  ],
);

export const expenseClaimsRelations = relations(expenseClaims, ({ one, many }) => ({
  employee: one(employees, { fields: [expenseClaims.employeeId], references: [employees.id] }),
  reviewer: one(users, { fields: [expenseClaims.reviewedBy], references: [users.id] }),
  items: many(expenseItems),
  reimbursements: many(expenseReimbursements),
  invoiceLinks: many(expenseToInvoiceLinks),
}));

export const expenseItemsRelations = relations(expenseItems, ({ one }) => ({
  claim: one(expenseClaims, { fields: [expenseItems.claimId], references: [expenseClaims.id] }),
  category: one(expenseCategories, { fields: [expenseItems.categoryId], references: [expenseCategories.id] }),
}));

export const expenseReimbursementsRelations = relations(expenseReimbursements, ({ one }) => ({
  claim: one(expenseClaims, { fields: [expenseReimbursements.claimId], references: [expenseClaims.id] }),
  processor: one(users, { fields: [expenseReimbursements.processedBy], references: [users.id] }),
}));

export const expenseToInvoiceLinksRelations = relations(expenseToInvoiceLinks, ({ one }) => ({
  claim: one(expenseClaims, { fields: [expenseToInvoiceLinks.expenseClaimId], references: [expenseClaims.id] }),
  invoice: one(invoices, { fields: [expenseToInvoiceLinks.invoiceId], references: [invoices.id] }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  items: many(expenseItems),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one }) => ({
  employee: one(employees, { fields: [salaryStructures.employeeId], references: [employees.id] }),
}));

export const deductionDefinitionsRelations = relations(deductionDefinitions, ({ many }) => ({
  employeeDeductions: many(employeeDeductions),
}));

export const employeeDeductionsRelations = relations(employeeDeductions, ({ one }) => ({
  employee: one(employees, { fields: [employeeDeductions.employeeId], references: [employees.id] }),
  deduction: one(deductionDefinitions, { fields: [employeeDeductions.deductionId], references: [deductionDefinitions.id] }),
}));

export const employeeBankDetailsRelations = relations(employeeBankDetails, ({ one }) => ({
  employee: one(employees, { fields: [employeeBankDetails.employeeId], references: [employees.id] }),
}));

export const payrollPeriodsRelations = relations(payrollPeriods, ({ one, many }) => ({
  processedByUser: one(users, { fields: [payrollPeriods.processedBy], references: [users.id] }),
  runs: many(payrollRuns),
}));

export const payrollRunsRelations = relations(payrollRuns, ({ one }) => ({
  period: one(payrollPeriods, { fields: [payrollRuns.payrollPeriodId], references: [payrollPeriods.id] }),
  employee: one(employees, { fields: [payrollRuns.employeeId], references: [employees.id] }),
  payslip: one(payslips),
}));

export const payslipsRelations = relations(payslips, ({ one }) => ({
  payrollRun: one(payrollRuns, { fields: [payslips.payrollRunId], references: [payrollRuns.id] }),
  employee: one(employees, { fields: [payslips.employeeId], references: [employees.id] }),
}));
