import { relations } from "drizzle-orm/relations";
import { users, userPermissions, employees, attendanceRecords, departments, auditLogs, sessions, userRoles, roles, leads, leadContacts, chatMessages, crmPipelines, crmStages, clients, invoices, workOrders, leadActivities, chatGroups, leadStageHistory, notificationTemplates, notificationLogs, tasks, clientInteractions, taskComments, clientContacts, invoiceItems, paymentRecords, siteSettings, notifications, chatMessageReads, chatGroupMembers } from "./schema";

export const userPermissionsRelations = relations(userPermissions, ({one}) => ({
	user_userId: one(users, {
		fields: [userPermissions.userId],
		references: [users.id],
		relationName: "userPermissions_userId_users_id"
	}),
	user_grantedBy: one(users, {
		fields: [userPermissions.grantedBy],
		references: [users.id],
		relationName: "userPermissions_grantedBy_users_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userPermissions_userId: many(userPermissions, {
		relationName: "userPermissions_userId_users_id"
	}),
	userPermissions_grantedBy: many(userPermissions, {
		relationName: "userPermissions_grantedBy_users_id"
	}),
	attendanceRecords: many(attendanceRecords),
	employees: many(employees),
	auditLogs: many(auditLogs),
	sessions: many(sessions),
	userRoles: many(userRoles),
	chatMessages: many(chatMessages),
	leadActivities: many(leadActivities),
	chatGroups: many(chatGroups),
	leadStageHistories: many(leadStageHistory),
	notificationLogs: many(notificationLogs),
	tasks: many(tasks),
	clientInteractions: many(clientInteractions),
	taskComments: many(taskComments),
	paymentRecords: many(paymentRecords),
	siteSettings: many(siteSettings),
	notifications_userId: many(notifications, {
		relationName: "notifications_userId_users_id"
	}),
	notifications_actorUserId: many(notifications, {
		relationName: "notifications_actorUserId_users_id"
	}),
	chatMessageReads: many(chatMessageReads),
	chatGroupMembers: many(chatGroupMembers),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({one}) => ({
	employee: one(employees, {
		fields: [attendanceRecords.employeeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [attendanceRecords.correctedByUserId],
		references: [users.id]
	}),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	attendanceRecords: many(attendanceRecords),
	user: one(users, {
		fields: [employees.userId],
		references: [users.id]
	}),
	department: one(departments, {
		fields: [employees.departmentId],
		references: [departments.id]
	}),
	leads: many(leads),
	tasks: many(tasks),
	clients: many(clients),
}));

export const departmentsRelations = relations(departments, ({many}) => ({
	employees: many(employees),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.actorUserId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
}));

export const leadContactsRelations = relations(leadContacts, ({one}) => ({
	lead: one(leads, {
		fields: [leadContacts.leadId],
		references: [leads.id]
	}),
}));

export const leadsRelations = relations(leads, ({one, many}) => ({
	leadContacts: many(leadContacts),
	crmPipeline: one(crmPipelines, {
		fields: [leads.pipelineId],
		references: [crmPipelines.id]
	}),
	crmStage: one(crmStages, {
		fields: [leads.stageId],
		references: [crmStages.id]
	}),
	client: one(clients, {
		fields: [leads.clientId],
		references: [clients.id]
	}),
	employee: one(employees, {
		fields: [leads.ownerEmployeeId],
		references: [employees.id]
	}),
	invoices: many(invoices),
	leadActivities: many(leadActivities),
	leadStageHistories: many(leadStageHistory),
	notificationLogs: many(notificationLogs),
	workOrders: many(workOrders),
}));

export const chatMessagesRelations = relations(chatMessages, ({one, many}) => ({
	user: one(users, {
		fields: [chatMessages.senderId],
		references: [users.id]
	}),
	chatMessageReads: many(chatMessageReads),
}));

export const crmStagesRelations = relations(crmStages, ({one, many}) => ({
	crmPipeline: one(crmPipelines, {
		fields: [crmStages.pipelineId],
		references: [crmPipelines.id]
	}),
	leads: many(leads),
	leadStageHistories_fromStageId: many(leadStageHistory, {
		relationName: "leadStageHistory_fromStageId_crmStages_id"
	}),
	leadStageHistories_toStageId: many(leadStageHistory, {
		relationName: "leadStageHistory_toStageId_crmStages_id"
	}),
}));

export const crmPipelinesRelations = relations(crmPipelines, ({many}) => ({
	crmStages: many(crmStages),
	leads: many(leads),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	leads: many(leads),
	invoices: many(invoices),
	notificationLogs: many(notificationLogs),
	tasks: many(tasks),
	clientInteractions: many(clientInteractions),
	employee: one(employees, {
		fields: [clients.ownerEmployeeId],
		references: [employees.id]
	}),
	clientContacts: many(clientContacts),
	workOrders: many(workOrders),
}));

export const invoicesRelations = relations(invoices, ({one, many}) => ({
	lead: one(leads, {
		fields: [invoices.leadId],
		references: [leads.id]
	}),
	client: one(clients, {
		fields: [invoices.clientId],
		references: [clients.id]
	}),
	workOrder: one(workOrders, {
		fields: [invoices.workOrderId],
		references: [workOrders.id]
	}),
	notificationLogs: many(notificationLogs),
	invoiceItems: many(invoiceItems),
	paymentRecords: many(paymentRecords),
}));

export const workOrdersRelations = relations(workOrders, ({one, many}) => ({
	invoices: many(invoices),
	lead: one(leads, {
		fields: [workOrders.leadId],
		references: [leads.id]
	}),
	client: one(clients, {
		fields: [workOrders.clientId],
		references: [clients.id]
	}),
}));

export const leadActivitiesRelations = relations(leadActivities, ({one}) => ({
	lead: one(leads, {
		fields: [leadActivities.leadId],
		references: [leads.id]
	}),
	user: one(users, {
		fields: [leadActivities.userId],
		references: [users.id]
	}),
}));

export const chatGroupsRelations = relations(chatGroups, ({one, many}) => ({
	user: one(users, {
		fields: [chatGroups.createdBy],
		references: [users.id]
	}),
	notifications: many(notifications),
	chatGroupMembers: many(chatGroupMembers),
}));

export const leadStageHistoryRelations = relations(leadStageHistory, ({one}) => ({
	lead: one(leads, {
		fields: [leadStageHistory.leadId],
		references: [leads.id]
	}),
	crmStage_fromStageId: one(crmStages, {
		fields: [leadStageHistory.fromStageId],
		references: [crmStages.id],
		relationName: "leadStageHistory_fromStageId_crmStages_id"
	}),
	crmStage_toStageId: one(crmStages, {
		fields: [leadStageHistory.toStageId],
		references: [crmStages.id],
		relationName: "leadStageHistory_toStageId_crmStages_id"
	}),
	user: one(users, {
		fields: [leadStageHistory.userId],
		references: [users.id]
	}),
}));

export const notificationLogsRelations = relations(notificationLogs, ({one}) => ({
	notificationTemplate: one(notificationTemplates, {
		fields: [notificationLogs.templateId],
		references: [notificationTemplates.id]
	}),
	lead: one(leads, {
		fields: [notificationLogs.leadId],
		references: [leads.id]
	}),
	client: one(clients, {
		fields: [notificationLogs.clientId],
		references: [clients.id]
	}),
	invoice: one(invoices, {
		fields: [notificationLogs.invoiceId],
		references: [invoices.id]
	}),
	user: one(users, {
		fields: [notificationLogs.actorUserId],
		references: [users.id]
	}),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({many}) => ({
	notificationLogs: many(notificationLogs),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	user: one(users, {
		fields: [tasks.creatorUserId],
		references: [users.id]
	}),
	employee: one(employees, {
		fields: [tasks.assigneeEmployeeId],
		references: [employees.id]
	}),
	client: one(clients, {
		fields: [tasks.clientId],
		references: [clients.id]
	}),
	taskComments: many(taskComments),
}));

export const clientInteractionsRelations = relations(clientInteractions, ({one}) => ({
	client: one(clients, {
		fields: [clientInteractions.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [clientInteractions.userId],
		references: [users.id]
	}),
}));

export const taskCommentsRelations = relations(taskComments, ({one}) => ({
	task: one(tasks, {
		fields: [taskComments.taskId],
		references: [tasks.id]
	}),
	user: one(users, {
		fields: [taskComments.userId],
		references: [users.id]
	}),
}));

export const clientContactsRelations = relations(clientContacts, ({one}) => ({
	client: one(clients, {
		fields: [clientContacts.clientId],
		references: [clients.id]
	}),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({one}) => ({
	invoice: one(invoices, {
		fields: [invoiceItems.invoiceId],
		references: [invoices.id]
	}),
}));

export const paymentRecordsRelations = relations(paymentRecords, ({one}) => ({
	invoice: one(invoices, {
		fields: [paymentRecords.invoiceId],
		references: [invoices.id]
	}),
	user: one(users, {
		fields: [paymentRecords.createdByUserId],
		references: [users.id]
	}),
}));

export const siteSettingsRelations = relations(siteSettings, ({one}) => ({
	user: one(users, {
		fields: [siteSettings.updatedBy],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user_userId: one(users, {
		fields: [notifications.userId],
		references: [users.id],
		relationName: "notifications_userId_users_id"
	}),
	chatGroup: one(chatGroups, {
		fields: [notifications.groupId],
		references: [chatGroups.id]
	}),
	user_actorUserId: one(users, {
		fields: [notifications.actorUserId],
		references: [users.id],
		relationName: "notifications_actorUserId_users_id"
	}),
}));

export const chatMessageReadsRelations = relations(chatMessageReads, ({one}) => ({
	chatMessage: one(chatMessages, {
		fields: [chatMessageReads.messageId],
		references: [chatMessages.id]
	}),
	user: one(users, {
		fields: [chatMessageReads.userId],
		references: [users.id]
	}),
}));

export const chatGroupMembersRelations = relations(chatGroupMembers, ({one}) => ({
	chatGroup: one(chatGroups, {
		fields: [chatGroupMembers.groupId],
		references: [chatGroups.id]
	}),
	user: one(users, {
		fields: [chatGroupMembers.userId],
		references: [users.id]
	}),
}));