"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getUserGroups,
  getGroupUnreadCounts,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  getOrCreateDirectMessageGroup,
  createChatGroup,
} from "@/app/actions/chat";
import { ChatSidebar } from "./_components/chat-sidebar";
import { useChatRealtime } from "./_hooks/use-chat-realtime";
import { UserContext } from "./user-context";
import type { Group, User } from "./_types";
import type { CurrentUser } from "@/lib/auth/session";
import { useMediaQuery } from "@/hooks/use-media-query";

type Props = {
  initialGroups: Group[];
  allUsers: User[];
  currentUser: CurrentUser;
  children: React.ReactNode;
};

export function ChatShell({ initialGroups, allUsers, currentUser, children }: Props) {
  const params = useParams();
  const router = useRouter();
  const currentId = typeof params.id === "string" ? params.id : "";
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const unreadDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const allGroupIds = groups.map((g) => g.id);

  useEffect(() => {
    if (currentId && !isDesktop) {
      setMobileSidebarOpen(false);
    }
  }, [currentId, isDesktop]);

  function loadUnreadCounts() {
    if (unreadDebounceRef.current) clearTimeout(unreadDebounceRef.current);
    unreadDebounceRef.current = setTimeout(() => {
      getGroupUnreadCounts().then((counts) => {
        setUnreadCounts(new Map(counts.map((c) => [c.groupId, c.count])));
      }).catch(() => {});
    }, 2000);
  }

  const refreshGroups = useCallback(async () => {
    try {
      const newGroups = await getUserGroups();
      setGroups(newGroups);
    } catch {}
  }, []);

  useChatRealtime(allGroupIds, {
    new_message: (data) => {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === data.groupId
            ? { ...g, lastMessageContent: data.message.content, lastMessageAt: new Date().toISOString() }
            : g,
        ),
      );
      loadUnreadCounts();
    },
    unread_update: (data) => {
      setUnreadCounts((prev) => {
        const next = new Map(prev);
        next.set(data.groupId, data.count);
        return next;
      });
    },
    notification: (data) => {
      setNotifications((prev) => [data, ...prev].slice(0, 10));
      setUnreadNotifCount((c) => c + 1);
    },
    reconnected: () => {
      refreshGroups();
    },
  });

  useEffect(() => {
    loadUnreadCounts();
    return () => {
      if (unreadDebounceRef.current) clearTimeout(unreadDebounceRef.current);
    };
  }, [currentId]);

  const handleStartDM = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const result = await getOrCreateDirectMessageGroup(userId);
      const newGroups = await getUserGroups();
      setGroups(newGroups);
      loadUnreadCounts();
      return result.groupId;
    } catch {
      return null;
    }
  }, []);

  const handleCreateGroup = useCallback(async (formData: FormData) => {
    const result = await createChatGroup(formData);
    const newGroups = await getUserGroups();
    setGroups(newGroups);
    return result;
  }, []);

  const hasActiveChat = !!currentId;

  return (
    <UserContext.Provider value={currentUser}>
      <div className="flex min-h-0 flex-1 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.30),transparent_34%),linear-gradient(180deg,#eef7fc_0%,#f8fbfd_46%,#ffffff_100%)]">
        <ChatSidebar
          groups={groups}
          users={allUsers}
          currentUserId={currentUser.id}
          selectedGroupId={currentId}
          unreadCounts={unreadCounts}
          isAdmin={currentUser.roles.includes("admin") || currentUser.permissions.includes("chat")}
          onStartDM={handleStartDM}
          onCreateGroup={handleCreateGroup}
          isMobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          onMobileOpen={() => setMobileSidebarOpen(true)}
        />

        {!hasActiveChat && !isDesktop ? null : null}
        <div className={`flex min-w-0 flex-1 flex-col ${!hasActiveChat && !isDesktop ? "hidden lg:flex" : ""}`}>
          {children}
        </div>
      </div>
    </UserContext.Provider>
  );
}
