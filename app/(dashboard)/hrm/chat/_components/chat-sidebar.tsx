"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, MessageCircle, MessageSquare, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalForm } from "@/components/modal-form";
import { Field } from "@/components/ui/field";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Avatar } from "./avatar";
import type { Group, User } from "../_types";

type Props = {
  groups: Group[];
  users: User[];
  currentUserId: string;
  selectedGroupId: string;
  unreadCounts: Map<string, number>;
  isAdmin?: boolean;
  onCreateGroup?: (formData: FormData) => Promise<{ groupId: string }>;
  onStartDM?: (userId: string) => Promise<string | null>;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onMobileOpen?: () => void;
};

export function ChatSidebar({
  groups,
  users,
  currentUserId,
  selectedGroupId,
  unreadCounts,
  isAdmin,
  onCreateGroup,
  onStartDM,
  isMobileOpen,
  onMobileClose,
  onMobileOpen,
}: Props) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const teamGroups = groups.filter((g) => g.type === "team" || g.type === "group");
  const dmGroups = groups.filter((g) => g.type === "direct");

  const handleSelect = (id: string) => {
    router.push(`/hrm/chat/${id}`);
    if (!isDesktop) onMobileClose?.();
  };

  const handleStartDM = async (userId: string) => {
    if (onStartDM) {
      const groupId = await onStartDM(userId);
      if (groupId) {
        router.push(`/hrm/chat/${groupId}`);
        if (!isDesktop) onMobileClose?.();
      }
    }
  };

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

  const sidebarContent = (
    <div className="flex h-full w-full flex-col">
      <div className="shrink-0 border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Inbox</p>
            <h2 className="text-base font-black text-slate-800">Messages</h2>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && onCreateGroup && (
              <ModalForm
                title="Create group"
                description="Create a group chat for a project or team."
                triggerLabel=""
                triggerIcon={<Plus className="h-4 w-4" />}
                triggerVariant="ghost"
                triggerSize="icon"
                triggerTitle="Create group"
                triggerClassName="text-sky-600 hover:bg-sky-100"
                action={async (formData) => {
                  const result = await onCreateGroup(formData);
                  if (result) handleSelect(result.groupId);
                }}
                submitLabel="Create"
              >
                <Field label="Group name" name="name" required />
                <Field label="Description" name="description" />
              </ModalForm>
            )}
            {!isDesktop && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMobileClose}
                className="text-slate-500 hover:bg-sky-100 hover:text-slate-700 lg:hidden"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {teamGroups.length > 0 && (
          <div className="px-2">
            <div className="mb-2 flex items-center gap-2 px-3">
              <span className="flex h-1.5 w-1.5 rounded-full bg-sky-400" />
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">Groups</p>
            </div>
            {teamGroups.map((group) => {
              const unread = unreadCounts.get(group.id) ?? 0;
              const isActive = selectedGroupId === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => handleSelect(group.id)}
                  className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                    isActive
                      ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200"
                      : "text-slate-600 hover:bg-sky-50/50 hover:text-slate-700"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-sky-500" />
                  )}
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
                    isActive
                      ? "bg-sky-500 text-white shadow-sm ring-sky-500"
                      : "bg-sky-50 text-sky-600 ring-sky-100"
                  }`}>
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm ${isActive ? "font-bold text-slate-800" : "font-semibold text-slate-700"}`}>{group.name}</p>
                      {unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                    {group.lastMessageContent && (
                      <p className="truncate text-xs font-medium text-slate-400">{group.lastMessageContent}</p>
                    )}
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition ${isActive ? "text-sky-400" : "text-slate-300"}`} />
                </button>
              );
            })}
          </div>
        )}

        <div className="px-2 pt-5">
          <div className="mb-2 flex items-center gap-2 px-3">
            <span className="flex h-1.5 w-1.5 rounded-full bg-sky-400" />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
              Direct Messages
            </p>
          </div>
          {users
            .filter((u) => u.id !== currentUserId)
            .map((user) => {
              const existingDm = dmGroups.find((g) =>
                g.name.toLowerCase() === user.name.toLowerCase(),
              );
              const unread = existingDm ? unreadCounts.get(existingDm.id) ?? 0 : 0;
              const isActive = selectedGroupId === (existingDm?.id ?? "");
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    if (existingDm) {
                      handleSelect(existingDm.id);
                    } else {
                      handleStartDM(user.id);
                    }
                  }}
                  className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                    isActive
                      ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200"
                      : "text-slate-600 hover:bg-sky-50/50 hover:text-slate-700"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-sky-500" />
                  )}
                  <Avatar name={user.name} url={user.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm ${isActive ? "font-bold text-slate-800" : "font-semibold text-slate-700"}`}>{user.name}</p>
                      {unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                    {existingDm?.lastMessageContent && (
                      <p className="truncate text-xs font-medium text-slate-400">{existingDm.lastMessageContent}</p>
                    )}
                  </div>
                  <MessageCircle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="flex h-full w-72 flex-col border-r border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.10)] max-lg:hidden">
        {sidebarContent}
      </div>
    );
  }

  return (
    <>
      <div className={`${isMobileOpen ? "hidden" : ""} ${selectedGroupId ? "hidden" : "flex"} w-full flex-1 flex-col lg:hidden`}>
        <div className="flex h-full w-full flex-col">
          {sidebarContent}
        </div>
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="absolute inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-xl">
            {sidebarContent}
          </div>
        </div>
      ) : null}
    </>
  );
}
