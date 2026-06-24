"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/auth/session";
import { Bell, PanelLeftClose, PanelLeftOpen, PanelLeft, User, LogOut } from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function NotificationBell() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef(new Set<string>());

  async function loadNotifs() {
    try {
      const { getNotifications, getUnreadNotificationCount } = await import("@/app/actions/chat");
      const list = await getNotifications();
      setNotifications(list);
      setUnreadCount(await getUnreadNotificationCount());
      for (const n of list) {
        if (!n.readAt && !knownIds.current.has(n.id)) {
          knownIds.current.add(n.id);
          if (document.hasFocus() && "Notification" in window && Notification.permission === "granted") {
            new Notification(n.title, { body: n.body });
          }
        }
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (showNotifs) loadNotifs();
  }, [showNotifs]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    loadNotifs();
    const onVisible = () => { if (document.visibilityState === "visible") loadNotifs(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(loadNotifs, 30000);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function Avatar({ name, url, size = "sm" }: { name: string; url: string | null; size?: string }) {
    const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
    const textSize = size === "sm" ? "text-xs" : "text-sm";
    const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    if (url) {
      return <img src={url} alt={name} className={`${dim} shrink-0 rounded-full object-cover border border-border`} />;
    }
    return (
      <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-primary ${textSize} font-bold text-primary-foreground`}>
        {initials}
      </div>
    );
  }

  return (
    <div className="relative" ref={notifRef}>
      <button
        type="button"
        onClick={() => setShowNotifs(!showNotifs)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 dark:bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {showNotifs && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-sm:max-w-[calc(100vw-16px)] max-sm:right-2 rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const { markAllNotificationsRead } = await import("@/app/actions/chat");
                  await markAllNotificationsRead();
                  loadNotifs();
                }}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications.</p>
            )}
            {notifications.map((n: any) => {
              const href = n.groupId ? `/hrm/chat/${n.groupId}` : n.type === "task_assigned" ? "/tasks" : n.type === "leave_request" || n.type === "leave_review" ? "/leaves" : null;
              const handleClick = async () => {
                if (!n.readAt) {
                  try {
                    const { markNotificationRead } = await import("@/app/actions/chat");
                    const fd = new FormData();
                    fd.set("id", n.id);
                    await markNotificationRead(fd);
                    loadNotifs();
                  } catch { /* ignore */ }
                }
                if (href) window.location.href = href;
                setShowNotifs(false);
              };
              const content = (
                <div className={`flex items-start gap-3 ${href ? "cursor-pointer" : ""}`}>
                  <Avatar name={n.actorName || "?"} url={null} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {n.actorName || "System"} · {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  </div>
                  {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
              );
              if (href) {
                return (
                  <div key={n.id} onClick={handleClick} className={`border-b border-border px-4 py-3 transition hover:bg-accent ${n.readAt ? "opacity-60" : ""}`}>
                    {content}
                  </div>
                );
              }
              return (
                <div key={n.id} className={`border-b border-border px-4 py-3 ${n.readAt ? "opacity-60" : ""}`}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopNav({
  user,
  collapsed,
  onToggleSidebar,
  onMobileToggle,
}: {
  user: CurrentUser;
  collapsed: boolean;
  onToggleSidebar: () => void;
  onMobileToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur sm:min-h-16 sm:px-6 safe-top">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileToggle}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent lg:hidden"
          aria-label="Open menu"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>
      <div className="relative flex items-center gap-3" ref={menuRef}>
        <NotificationBell />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="flex items-center gap-2 rounded-full transition hover:opacity-80"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-9 w-9 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {getInitials(user.name)}
            </div>
          )}
          <span className="hidden text-sm font-medium text-muted-foreground sm:block">
            {user.name}
          </span>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground transition hover:bg-accent"
            >
              <User className="h-4 w-4" />
              My Profile
            </Link>
            <hr className="border-border" />
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-destructive transition hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
