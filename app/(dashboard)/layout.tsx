import { DashboardShell } from "@/components/dashboard-shell";
import type { SidebarGroup, SidebarItem } from "@/components/app-sidebar";
import { canAccess, type PermissionArea } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/app/actions/settings";

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
      label: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", area: "dashboard", iconName: "dashboard" },
      ],
    },
    {
      label: "Human Resources",
      items: [
        { href: "/employees", label: "Employees", area: "employees", iconName: "employees" },
        { href: "/departments", label: "Departments", area: "departments", iconName: "departments" },
        { href: "/attendance", label: "Attendance", area: "attendance", iconName: "attendance" },
        { href: "/leaves", label: "Leaves", area: "leaves", iconName: "leaves" },
        { href: "/payroll", label: "Payroll", area: "payroll", iconName: "payroll" },
        { href: "/hrm/chat", label: "Team Chat", area: "chat", iconName: "messageSquare" },
      ],
    },
    {
      label: "CRM",
      items: [
        { href: "/crm", label: "Overview", area: "crm", iconName: "crmOverview" },
        { href: "/crm/leads", label: "Leads", area: "crm_leads", iconName: "leads" },
        { href: "/crm/pipeline", label: "Pipeline", area: "crm_pipeline", iconName: "pipeline" },
        { href: "/crm/clients", label: "Clients", area: "crm_clients", iconName: "clients" },
        { href: "/crm/activities", label: "Activities", area: "crm_activities", iconName: "activities" },
      ],
    },
    {
      label: "Finance",
      items: [
        { href: "/crm/invoices", label: "Invoices", area: "crm_invoices", iconName: "invoices" },
        { href: "/crm/payments", label: "Payments", area: "crm_payments", iconName: "payments" },
        { href: "/expenses", label: "Expenses", area: "expenses", iconName: "expenses" },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/work-orders", label: "Work Orders", area: "work_orders", iconName: "workOrders" },
        { href: "/tasks", label: "Tasks", area: "tasks", iconName: "tasks" },
        { href: "/attendance/reports", label: "Reports", area: "attendance_reports", iconName: "reports" },
      ],
    },
    {
      label: "Administration",
      items: [
        { href: "/users", label: "Users", area: "users", iconName: "users" },
        { href: "/settings", label: "Settings", area: "settings", iconName: "settings" },
        { href: "/crm/templates", label: "Templates", area: "crm_templates", iconName: "templates" },
      ],
    },
  ];
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(user, item.area)),
    }))
    .filter((group) => group.items.length > 0);

  let logoUrl: string | null = null;
  try {
    const settings = await getSiteSettings();
    logoUrl = settings.logoUrl;
  } catch {}

  return (
    <DashboardShell
      user={user}
      navGroups={visibleGroups}
      logoUrl={logoUrl}
    >
      {children}
    </DashboardShell>
  );
}
