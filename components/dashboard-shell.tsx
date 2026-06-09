"use client";

import { useState } from "react";
import { AppSidebar, type SidebarGroup } from "@/components/app-sidebar";
import { TopNav } from "@/components/top-nav";
import type { CurrentUser } from "@/lib/auth/session";

export function DashboardShell({
  user,
  navGroups,
  children,
}: {
  user: CurrentUser;
  navGroups: SidebarGroup[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebar-collapsed") === "true";
  });

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <AppSidebar collapsed={collapsed} groups={navGroups} />
      <div
        className={`flex min-w-0 flex-1 flex-col transition-[padding-left] duration-200 ${
          collapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <TopNav user={user} collapsed={collapsed} onToggleSidebar={toggleSidebar} />
        <main className="flex-1 p-4 sm:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
