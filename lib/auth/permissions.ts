export const roleNames = ["admin", "hr", "manager", "employee", "sales"] as const;

export type RoleName = (typeof roleNames)[number];

const permissions = {
  dashboard: ["admin", "hr", "manager", "employee", "sales"],
  employees: ["admin", "hr", "manager"],
  attendance: ["admin", "hr", "manager", "employee"],
  attendance_reports: ["admin"],
  tasks: ["admin", "hr", "manager", "employee", "sales"],
  crm: ["admin", "manager", "sales"],
  clients: ["admin", "manager", "sales"],
  users: ["admin", "hr"],
  settings: ["admin", "manager"],
  chat: ["admin", "hr", "manager", "employee", "sales"],
  work_orders: ["admin", "manager", "sales"],
} satisfies Record<string, RoleName[]>;

export type PermissionArea = keyof typeof permissions;

export function canAccess(userRoles: string[], area: PermissionArea) {
  return permissions[area].some((role) => userRoles.includes(role));
}

export function requirePermission(userRoles: string[], area: PermissionArea) {
  if (!canAccess(userRoles, area)) {
    throw new Error("You do not have permission to perform this action.");
  }
}
