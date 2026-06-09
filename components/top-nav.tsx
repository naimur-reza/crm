"use client";

import { logout } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/auth/session";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export function TopNav({
  user,
  collapsed,
  onToggleSidebar,
}: {
  user: CurrentUser;
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
        <div>
          <p className="text-sm text-slate-500">Workspace</p>
          <p className="font-medium text-slate-950">Operations command center</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-950">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-400">
            {user.roles.join(", ")}
          </p>
        </div>
        <form action={logout}>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
