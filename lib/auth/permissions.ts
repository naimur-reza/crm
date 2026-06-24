import type { CurrentUser } from "./session";

export const roleNames = [
  "admin",
  "hr",
  "manager",
  "employee",
  "sales",
] as const;

export type RoleName = (typeof roleNames)[number];

export const permissions = {
  dashboard: ["admin", "hr", "manager", "employee", "sales"],
  employees: ["admin", "hr", "manager"],
  attendance: ["admin", "hr", "manager", "employee"],
  attendance_reports: ["admin"],
  tasks: ["admin", "hr", "manager", "employee", "sales"],
  crm: ["admin", "manager", "sales"],
  crm_leads: ["admin", "manager", "sales"],
  crm_pipeline: ["admin", "manager", "sales"],
  crm_clients: ["admin", "manager", "sales"],
  crm_activities: ["admin", "manager", "sales"],
  crm_invoices: ["admin", "manager", "sales"],
  crm_payments: ["admin", "manager", "sales"],
  crm_templates: ["admin", "manager", "sales"],
  clients: ["admin", "manager", "sales"],
  users: ["admin", "hr"],
  settings: ["admin", "manager"],
  chat: ["admin", "hr", "manager", "employee", "sales"],
  work_orders: ["admin", "manager", "sales"],
  departments: ["admin", "hr"],
  leaves: ["admin", "hr", "manager", "employee"],
  payroll: ["admin", "hr"],
  payroll_runs: ["admin", "hr"],
  ai: ["admin", "manager", "sales", "hr"],
  expenses: ["admin", "hr", "manager", "employee"],
} satisfies Record<string, RoleName[]>;

const crmSubAreas = [
  "crm",
  "crm_leads",
  "crm_pipeline",
  "crm_clients",
  "crm_activities",
  "crm_invoices",
  "crm_payments",
  "crm_templates",
];

export type PermissionArea = keyof typeof permissions;

export function canAccess(user: CurrentUser, area: PermissionArea) {
  if (user.permissions.includes(area)) return true;
  if (crmSubAreas.includes(area) && user.permissions.includes("crm")) return true;
  return permissions[area].some((role) => user.roles.includes(role));
}

export function requirePermission(user: CurrentUser, area: PermissionArea) {
  if (!canAccess(user, area)) {
    throw new Error("You do not have permission to perform this action.");
  }
}
