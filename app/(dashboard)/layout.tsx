import { DashboardShell } from "@/components/dashboard-shell";
import type { SidebarGroup, SidebarItem } from "@/components/app-sidebar";
import { canAccess, type PermissionArea } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  type NavItemWithPermission = SidebarItem & { area: PermissionArea };
  type NavGroupWithPermission = Omit<SidebarGroup, "items"> & {
    items: NavItemWithPermission[];
  };
  const navGroups: NavGroupWithPermission[] = [
    {
      label: "Company",
      items: [
        { href: "/dashboard", label: "Dashboard", area: "dashboard", iconName: "dashboard" },
        { href: "/employees", label: "Employees", area: "employees", iconName: "employees" },
        { href: "/hrm/chat", label: "Team Chat", area: "chat", iconName: "messageSquare" },
        { href: "/attendance", label: "Attendance", area: "attendance", iconName: "attendance" },
        { href: "/attendance/reports", label: "Reports", area: "attendance_reports", iconName: "reports" },
        { href: "/work-orders", label: "Work Orders", area: "work_orders", iconName: "workOrders" },
        { href: "/tasks", label: "Tasks", area: "tasks", iconName: "tasks" },
        { href: "/users", label: "Users", area: "users", iconName: "users" },
        { href: "/settings", label: "Settings", area: "settings", iconName: "settings" },
      ],
    },
    {
      label: "CRM",
      items: [
        { href: "/crm", label: "Overview", area: "crm", iconName: "dashboard" },
        { href: "/crm/leads", label: "Leads", area: "crm", iconName: "leads" },
        { href: "/crm/pipeline", label: "Pipeline", area: "crm", iconName: "pipeline" },
        { href: "/crm/clients", label: "Clients", area: "crm", iconName: "clients" },
        { href: "/crm/activities", label: "Activities", area: "crm", iconName: "activities" },
        { href: "/crm/invoices", label: "Invoices", area: "crm", iconName: "invoices" },
        { href: "/crm/payments", label: "Payments", area: "crm", iconName: "payments" },
        { href: "/crm/templates", label: "Templates", area: "crm", iconName: "templates" },
      ],
    },
  ];
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(user.roles, item.area)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <DashboardShell
      user={user}
      navGroups={visibleGroups}
    >
      {children}
    </DashboardShell>
  );
}
