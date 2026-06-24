"use client";

import { useState } from "react";
import { AppSidebar, type SidebarGroup } from "@/components/app-sidebar";
import { TopNav } from "@/components/top-nav";
import type { CurrentUser } from "@/lib/auth/session";

export function DashboardShell({
  user,
  navGroups,
  logoUrl,
  children,
}: {
  user: CurrentUser;
  navGroups: SidebarGroup[];
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebar-collapsed") === "true";
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <AppSidebar
        collapsed={collapsed}
        groups={navGroups}
        logoUrl={logoUrl}
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={`flex min-w-0 flex-1 flex-col transition-[padding-left] duration-200 ${
          collapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <TopNav
          user={user}
          collapsed={collapsed}
          onToggleSidebar={toggleSidebar}
          onMobileToggle={() => setMobileOpen((v) => !v)}
        />
        <main className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.30),transparent_34%),linear-gradient(180deg,#eef7fc_0%,#f8fbfd_46%,#ffffff_100%)] p-3 sm:p-4 lg:p-6 safe-bottom">
          {children}
        </main>
      </div>
    </div>
  );
}
