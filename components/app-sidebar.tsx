"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarCheck,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  MessageSquareText,
  PanelsTopLeft,
  ReceiptText,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

export type SidebarItem = {
  href: string;
  label: string;
  iconName:
    | "dashboard"
    | "employees"
    | "attendance"
    | "tasks"
    | "clients"
    | "users"
    | "leads"
    | "pipeline"
    | "activities"
    | "invoices"
    | "payments"
    | "templates"
    | "settings"
    | "messageSquare"
    | "reports"
    | "workOrders";
};

export type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

const icons = {
  dashboard: LayoutDashboard,
  employees: Users,
  attendance: CalendarCheck,
  tasks: CheckSquare,
  clients: Building2,
  users: Shield,
  leads: TrendingUp,
  pipeline: PanelsTopLeft,
  activities: MessageSquareText,
  invoices: FileText,
  payments: CreditCard,
  templates: ReceiptText,
  settings: Settings,
  messageSquare: MessageSquare,
  reports: FileText,
  workOrders: ClipboardList,
} satisfies Record<SidebarItem["iconName"], React.ComponentType<{ className?: string }>>;

function isActiveRoute(pathname: string, href: string, allHrefs: string[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  const hasMoreSpecificMatch = allHrefs.some(
    (other) => other !== href && (other === pathname || pathname.startsWith(`${other}/`)),
  );
  return !hasMoreSpecificMatch;
}

export function AppSidebar({
  collapsed,
  groups,
}: {
  collapsed: boolean;
  groups: SidebarGroup[];
}) {
  const pathname = usePathname();
  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-200/60 transition-[width] duration-200 lg:block ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex h-10 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950">
            CT
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Company Tools
              </p>
              <h1 className="truncate text-lg font-semibold">Management</h1>
            </div>
          ) : null}
        </div>
      </div>
      <nav className="space-y-4 px-3 py-4">
        {groups.map((group) => {
          const hasActiveChild = group.items.some(
            (item) => isActiveRoute(pathname, item.href, allHrefs),
          );
          return (
            <details key={group.label} open={!collapsed && hasActiveChild}>
              <summary
                className={`flex h-9 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 transition hover:bg-white/10 hover:text-white ${
                  collapsed ? "justify-center px-0" : ""
                }`}
              >
                {!collapsed ? <span>{group.label}</span> : <span>{group.label[0]}</span>}
                {!collapsed ? <ChevronDown className="h-4 w-4" /> : null}
              </summary>
              <div className="mt-1 space-y-1">
                {group.items.map((item) => {
                  const Icon = icons[item.iconName];
                  const active = isActiveRoute(pathname, item.href, allHrefs);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                        active
                          ? "bg-white text-slate-950"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </nav>
    </aside>
  );
}
