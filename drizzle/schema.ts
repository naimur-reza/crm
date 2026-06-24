import { pgTable, uniqueIndex, foreignKey, uuid, text, timestamp, index, date, jsonb, unique, boolean, integer, serial, bigint, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const activityType = pgEnum("activity_type", ['call', 'email', 'meeting', 'note', 'whatsapp', 'follow_up'])
export const attendanceSource = pgEnum("attendance_source", ['manual', 'admin', 'import'])
export const attendanceStatus = pgEnum("attendance_status", ['present', 'late', 'absent', 'half_day'])
export const chatGroupType = pgEnum("chat_group_type", ['team', 'group', 'direct'])
export const clientStatus = pgEnum("client_status", ['lead', 'active', 'paused', 'closed'])
export const employeeStatus = pgEnum("employee_status", ['active', 'inactive', 'on_leave'])
export const interactionType = pgEnum("interaction_type", ['call', 'email', 'meeting', 'note'])
export const invoiceStatus = pgEnum("invoice_status", ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'])
export const leadStatus = pgEnum("lead_status", ['open', 'won', 'lost'])
export const notificationChannel = pgEnum("notification_channel", ['whatsapp'])
export const notificationStatus = pgEnum("notification_status", ['generated', 'sent', 'failed'])
export const taskPriority = pgEnum("task_priority", ['low', 'medium', 'high', 'urgent'])
export const taskStatus = pgEnum("task_status", ['todo', 'in_progress', 'review', 'done', 'blocked'])
export const userStatus = pgEnum("user_status", ['active', 'inactive'])
export const workOrderStatus = pgEnum("work_order_status", ['pending', 'in_progress', 'completed', 'cancelled'])


export const userPermissions = pgTable("user_permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	permission: text().notNull(),
	grantedBy: uuid("granted_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("user_permissions_unique_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.permission.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_permissions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.grantedBy],
			foreignColumns: [users.id],
			name: "user_permissions_granted_by_users_id_fk"
		}).onDelete("set null"),
]);

export const attendanceRecords = pgTable("attendance_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employeeId: uuid("employee_id").notNull(),
	attendanceDate: date("attendance_date").notNull(),
	checkInAt: timestamp("check_in_at", { withTimezone: true, mode: 'string' }),
	checkOutAt: timestamp("check_out_at", { withTimezone: true, mode: 'string' }),
	status: attendanceStatus().default('present').notNull(),
	source: attendanceSource().default('manual').notNull(),
	notes: text(),
	correctedByUserId: uuid("corrected_by_user_id"),
	correctedAt: timestamp("corrected_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("attendance_date_idx").using("btree", table.attendanceDate.asc().nullsLast().op("date_ops")),
	uniqueIndex("attendance_employee_date_idx").using("btree", table.employeeId.asc().nullsLast().op("date_ops"), table.attendanceDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "attendance_records_employee_id_employees_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.correctedByUserId],
			foreignColumns: [users.id],
			name: "attendance_records_corrected_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const employees = pgTable("employees", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	departmentId: uuid("department_id"),
	fullName: text("full_name").notNull(),
	email: text().notNull(),
	phone: text(),
	designation: text().notNull(),
	joiningDate: date("joining_date"),
	status: employeeStatus().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("employees_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("employees_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "employees_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "employees_department_id_departments_id_fk"
		}).onDelete("set null"),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	actorUserId: uuid("actor_user_id"),
	action: text().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: uuid("entity_id"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audit_logs_actor_idx").using("btree", table.actorUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "audit_logs_actor_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const departments = pgTable("departments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("departments_name_unique").on(table.name),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	userAgent: text("user_agent"),
	ipAddress: text("ip_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("sessions_token_hash_idx").using("btree", table.tokenHash.asc().nullsLast().op("text_ops")),
	index("sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	label: text().notNull(),
	description: text(),
}, (table) => [
	unique("roles_name_unique").on(table.name),
]);

export const userRoles = pgTable("user_roles", {
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id").notNull(),
}, (table) => [
	uniqueIndex("user_roles_unique_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.roleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_role_id_roles_id_fk"
		}).onDelete("cascade"),
]);

export const leadContacts = pgTable("lead_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	leadId: uuid("lead_id").notNull(),
	name: text().notNull(),
	title: text(),
	email: text(),
	phone: text(),
	whatsappNumber: text("whatsapp_number"),
	isPrimary: boolean("is_primary").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("lead_contacts_lead_idx").using("btree", table.leadId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_contacts_lead_id_leads_id_fk"
		}).onDelete("cascade"),
]);

export const notificationTemplates = pgTable("notification_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: text().notNull(),
	name: text().notNull(),
	channel: notificationChannel().default('whatsapp').notNull(),
	body: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("notification_templates_key_idx").using("btree", table.key.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	status: userStatus().default('active').notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	avatarUrl: text("avatar_url"),
}, (table) => [
	uniqueIndex("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const chatMessages = pgTable("chat_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	senderId: uuid("sender_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	groupId: uuid("group_id"),
	type: text().default('user').notNull(),
}, (table) => [
	index("chat_messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("chat_messages_group_id_idx").using("btree", table.groupId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "chat_messages_sender_id_users_id_fk"
		}).onDelete("set null"),
]);

export const crmPipelines = pgTable("crm_pipelines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("crm_pipelines_name_unique").on(table.name),
]);

export const crmStages = pgTable("crm_stages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	pipelineId: uuid("pipeline_id").notNull(),
	name: text().notNull(),
	sortOrder: integer("sort_order").notNull(),
	probability: integer().default(0).notNull(),
	color: text().default('slate').notNull(),
	isWon: boolean("is_won").default(false).notNull(),
	isLost: boolean("is_lost").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("crm_stages_pipeline_order_idx").using("btree", table.pipelineId.asc().nullsLast().op("int4_ops"), table.sortOrder.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.pipelineId],
			foreignColumns: [crmPipelines.id],
			name: "crm_stages_pipeline_id_crm_pipelines_id_fk"
		}).onDelete("cascade"),
]);

export const leads = pgTable("leads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	pipelineId: uuid("pipeline_id"),
	stageId: uuid("stage_id"),
	clientId: uuid("client_id"),
	ownerEmployeeId: uuid("owner_employee_id"),
	title: text().notNull(),
	companyName: text("company_name"),
	source: text(),
	status: leadStatus().default('open').notNull(),
	valueCents: integer("value_cents").default(0).notNull(),
	expectedCloseDate: date("expected_close_date"),
	lostReason: text("lost_reason"),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("leads_owner_idx").using("btree", table.ownerEmployeeId.asc().nullsLast().op("uuid_ops")),
	index("leads_stage_idx").using("btree", table.stageId.asc().nullsLast().op("uuid_ops")),
	index("leads_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.pipelineId],
			foreignColumns: [crmPipelines.id],
			name: "leads_pipeline_id_crm_pipelines_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.stageId],
			foreignColumns: [crmStages.id],
			name: "leads_stage_id_crm_stages_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "leads_client_id_clients_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.ownerEmployeeId],
			foreignColumns: [employees.id],
			name: "leads_owner_employee_id_employees_id_fk"
		}).onDelete("set null"),
]);

export const invoices = pgTable("invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceNumber: text("invoice_number").notNull(),
	leadId: uuid("lead_id"),
	clientId: uuid("client_id"),
	status: invoiceStatus().default('draft').notNull(),
	issueDate: date("issue_date").notNull(),
	dueDate: date("due_date"),
	subtotalCents: integer("subtotal_cents").default(0).notNull(),
	discountCents: integer("discount_cents").default(0).notNull(),
	taxCents: integer("tax_cents").default(0).notNull(),
	totalCents: integer("total_cents").default(0).notNull(),
	notes: text(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	workOrderId: uuid("work_order_id"),
}, (table) => [
	index("invoices_lead_idx").using("btree", table.leadId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("invoices_number_idx").using("btree", table.invoiceNumber.asc().nullsLast().op("text_ops")),
	index("invoices_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("invoices_work_order_idx").using("btree", table.workOrderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "invoices_lead_id_leads_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "invoices_client_id_clients_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.workOrderId],
			foreignColumns: [workOrders.id],
			name: "invoices_work_order_id_work_orders_id_fk"
		}).onDelete("set null"),
]);

export const leadActivities = pgTable("lead_activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	leadId: uuid("lead_id").notNull(),
	userId: uuid("user_id"),
	type: activityType().default('note').notNull(),
	summary: text().notNull(),
	dueAt: timestamp("due_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("lead_activities_lead_idx").using("btree", table.leadId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_activities_lead_id_leads_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "lead_activities_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const chatGroups = pgTable("chat_groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	type: chatGroupType().default('group').notNull(),
	createdBy: uuid("created_by"),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "chat_groups_created_by_users_id_fk"
		}).onDelete("set null"),
]);

export const leadStageHistory = pgTable("lead_stage_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	leadId: uuid("lead_id").notNull(),
	fromStageId: uuid("from_stage_id"),
	toStageId: uuid("to_stage_id"),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("lead_stage_history_lead_idx").using("btree", table.leadId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_stage_history_lead_id_leads_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.fromStageId],
			foreignColumns: [crmStages.id],
			name: "lead_stage_history_from_stage_id_crm_stages_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.toStageId],
			foreignColumns: [crmStages.id],
			name: "lead_stage_history_to_stage_id_crm_stages_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "lead_stage_history_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const notificationLogs = pgTable("notification_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id"),
	leadId: uuid("lead_id"),
	clientId: uuid("client_id"),
	invoiceId: uuid("invoice_id"),
	channel: notificationChannel().default('whatsapp').notNull(),
	status: notificationStatus().default('generated').notNull(),
	recipientName: text("recipient_name"),
	recipientPhone: text("recipient_phone"),
	message: text().notNull(),
	waLink: text("wa_link"),
	actorUserId: uuid("actor_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("notification_logs_invoice_idx").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")),
	index("notification_logs_lead_idx").using("btree", table.leadId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [notificationTemplates.id],
			name: "notification_logs_template_id_notification_templates_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "notification_logs_lead_id_leads_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "notification_logs_client_id_clients_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "notification_logs_invoice_id_invoices_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "notification_logs_actor_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const drizzleMigrations = pgTable("__drizzle_migrations", {
	id: serial().primaryKey().notNull(),
	hash: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }),
});

export const tasks = pgTable("tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	status: taskStatus().default('todo').notNull(),
	priority: taskPriority().default('medium').notNull(),
	dueDate: date("due_date"),
	creatorUserId: uuid("creator_user_id"),
	assigneeEmployeeId: uuid("assignee_employee_id"),
	clientId: uuid("client_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	index("tasks_assignee_idx").using("btree", table.assigneeEmployeeId.asc().nullsLast().op("uuid_ops")),
	index("tasks_sort_order_idx").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
	index("tasks_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.creatorUserId],
			foreignColumns: [users.id],
			name: "tasks_creator_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.assigneeEmployeeId],
			foreignColumns: [employees.id],
			name: "tasks_assignee_employee_id_employees_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "tasks_client_id_clients_id_fk"
		}).onDelete("set null"),
]);

export const clientInteractions = pgTable("client_interactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clientId: uuid("client_id").notNull(),
	userId: uuid("user_id"),
	type: interactionType().default('note').notNull(),
	summary: text().notNull(),
	followUpAt: timestamp("follow_up_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("client_interactions_client_idx").using("btree", table.clientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_interactions_client_id_clients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "client_interactions_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const taskComments = pgTable("task_comments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	userId: uuid("user_id"),
	body: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("task_comments_task_idx").using("btree", table.taskId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_comments_task_id_tasks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "task_comments_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const clients = pgTable("clients", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	ownerEmployeeId: uuid("owner_employee_id"),
	status: clientStatus().default('lead').notNull(),
	source: text(),
	website: text(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("clients_owner_idx").using("btree", table.ownerEmployeeId.asc().nullsLast().op("uuid_ops")),
	index("clients_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.ownerEmployeeId],
			foreignColumns: [employees.id],
			name: "clients_owner_employee_id_employees_id_fk"
		}).onDelete("set null"),
]);

export const clientContacts = pgTable("client_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clientId: uuid("client_id").notNull(),
	name: text().notNull(),
	title: text(),
	email: text(),
	phone: text(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("client_contacts_client_idx").using("btree", table.clientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_contacts_client_id_clients_id_fk"
		}).onDelete("cascade"),
]);

export const workOrders = pgTable("work_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	workOrderNumber: text("work_order_number").notNull(),
	leadId: uuid("lead_id"),
	clientId: uuid("client_id"),
	title: text().notNull(),
	status: workOrderStatus().default('pending').notNull(),
	totalValueCents: integer("total_value_cents").default(0).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("work_orders_lead_idx").using("btree", table.leadId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("work_orders_number_idx").using("btree", table.workOrderNumber.asc().nullsLast().op("text_ops")),
	index("work_orders_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "work_orders_lead_id_leads_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "work_orders_client_id_clients_id_fk"
		}).onDelete("set null"),
]);

export const invoiceItems = pgTable("invoice_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	description: text().notNull(),
	quantity: integer().default(1).notNull(),
	unitPriceCents: integer("unit_price_cents").default(0).notNull(),
	totalCents: integer("total_cents").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("invoice_items_invoice_idx").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_items_invoice_id_invoices_id_fk"
		}).onDelete("cascade"),
]);

export const paymentRecords = pgTable("payment_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	amountCents: integer("amount_cents").notNull(),
	paymentDate: date("payment_date").notNull(),
	method: text().notNull(),
	reference: text(),
	notes: text(),
	createdByUserId: uuid("created_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payment_records_invoice_idx").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "payment_records_invoice_id_invoices_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "payment_records_created_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const siteSettings = pgTable("site_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyName: text("company_name").default('Company').notNull(),
	logoUrl: text("logo_url"),
	primaryColor: text("primary_color").default('oklch(0.62 0.14 242)').notNull(),
	fontFamily: text("font_family").default('Geist').notNull(),
	updatedBy: uuid("updated_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	theme: text().default('light').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "site_settings_updated_by_users_id_fk"
		}).onDelete("set null"),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	body: text().notNull(),
	groupId: uuid("group_id"),
	actorUserId: uuid("actor_user_id"),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("notifications_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("notifications_user_unread_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.readAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [chatGroups.id],
			name: "notifications_group_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "notifications_actor_user_id_fkey"
		}).onDelete("set null"),
]);

export const chatMessageReads = pgTable("chat_message_reads", {
	messageId: uuid("message_id").notNull(),
	userId: uuid("user_id").notNull(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [chatMessages.id],
			name: "chat_message_reads_message_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_message_reads_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.messageId, table.userId], name: "chat_message_reads_pkey"}),
]);

export const chatGroupMembers = pgTable("chat_group_members", {
	groupId: uuid("group_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: text().default('member').notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chat_group_members_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [chatGroups.id],
			name: "chat_group_members_group_id_chat_groups_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_group_members_user_id_users_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.groupId, table.userId], name: "chat_group_members_group_id_user_id_pk"}),
]);
