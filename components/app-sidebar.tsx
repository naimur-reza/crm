"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useCallback, useState } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Eye,
  FileJson,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  MessageSquareText,
  PanelsTopLeft,
  Receipt,
  Settings,
  Shield,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

export type SidebarItem = {
  href: string;
  label: string;
  iconName:
    | "dashboard"
    | "employees"
    | "departments"
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
    | "workOrders"
    | "calendarDays"
    | "crmOverview"
    | "leaves"
    | "expenses"
    | "payroll";
};

export type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

const icons = {
  dashboard: LayoutDashboard,
  employees: Users,
  departments: Building2,
  attendance: CalendarCheck,
  tasks: CheckSquare,
  clients: Handshake,
  users: Shield,
  leads: TrendingUp,
  pipeline: PanelsTopLeft,
  activities: MessageSquareText,
  invoices: Receipt,
  payments: CreditCard,
  templates: FileJson,
  settings: Settings,
  messageSquare: MessageSquare,
  reports: BarChart3,
  workOrders: ClipboardList,
  calendarDays: CalendarDays,
  crmOverview: Eye,
  leaves: CalendarDays,
  expenses: BadgeDollarSign,
  payroll: BadgeDollarSign,
} satisfies Record<
  SidebarItem["iconName"],
  React.ComponentType<{ className?: string }>
>;

function isActiveRoute(pathname: string, href: string, allHrefs: string[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  const hasMoreSpecificMatch = allHrefs.some(
    (other) =>
      other !== href &&
      (other === pathname || pathname.startsWith(`${other}/`)),
  );
  return !hasMoreSpecificMatch;
}

function SidebarContent({
  collapsed,
  groups,
  logoUrl,
  onNavigate,
}: {
  collapsed: boolean;
  groups: SidebarGroup[];
  logoUrl?: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));

  return (
    <>
      <div className="border-b border-white/10 px-4 py-5 flex justify-center">
        <div className="flex h-10 items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              width={collapsed ? 32 : 120}
              height={32}
              className={`shrink-0 ${collapsed ? "w-8" : "w-auto"}`}
              priority
            />
          ) : (
            <Image
              src="/logo-sidebar.png"
              alt="Company Tools"
              width={collapsed ? 32 : 120}
              height={32}
              className={`shrink-0 ${collapsed ? "w-8" : "w-auto"}`}
              priority
            />
          )}
        </div>
      </div>
      <nav className="space-y-4 px-3 py-4">
        {groups.map((group) => {
          const hasActiveChild = group.items.some((item) =>
            isActiveRoute(pathname, item.href, allHrefs),
          );
          return (
            <details key={group.label} open={!collapsed && hasActiveChild}>
              <summary
                className={`flex h-9 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-white/[0.06] hover:text-sky-200 ${
                  collapsed ? "justify-center px-0" : ""
                }`}
              >
                {!collapsed ? (
                  <span>{group.label}</span>
                ) : (
                  <span>{group.label[0]}</span>
                )}
                {!collapsed ? (
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                ) : null}
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
                      onClick={onNavigate}
                      className={`group relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-sky-500/15 text-sky-300"
                          : "text-slate-400 hover:bg-white/[0.06] hover:text-sky-200"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      {active ? (
                        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sky-400" />
                      ) : null}
                      <Icon
                        className={`h-5 w-5 shrink-0 transition-all duration-200 ${
                          active
                            ? "text-sky-400"
                            : "text-slate-500 group-hover:text-sky-400"
                        }`}
                      />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </nav>
    </>
  );
}

export function AppSidebar({
  collapsed,
  groups,
  logoUrl,
  isMobileOpen,
  onMobileClose,
}: {
  collapsed: boolean;
  groups: SidebarGroup[];
  logoUrl?: string | null;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        onMobileClose?.();
      }
    },
    [isMobileOpen, onMobileClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden shrink-0 overflow-y-auto border-r border-sky-900/30 bg-slate-900 text-white shadow-xl shadow-black/20 transition-[width] duration-200 lg:block ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          groups={groups}
          logoUrl={logoUrl}
        />
      </aside>

      {mounted ? (
        <div
          className={`fixed inset-0 z-40 transition-all duration-300 lg:hidden ${
            isMobileOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside
            className={`absolute inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto border-r border-sky-900/30 bg-slate-900 text-white shadow-xl shadow-black/20 transition-all duration-300 ease-out ${
              isMobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="text-sm font-semibold text-sky-200">Menu</span>
              <button
                type="button"
                onClick={onMobileClose}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white active:scale-95"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent
                collapsed={false}
                groups={groups}
                logoUrl={logoUrl}
                onNavigate={onMobileClose}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
