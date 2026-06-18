"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  LogOut,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  UserMinus,
  Users,
  ChevronRight,
  MessageCircle,
  UserPlus,
  X,
} from "lucide-react";
import {
  sendMessage,
  getMessages,
  deleteMessage,
  getOrCreateDirectMessageGroup,
  getUserGroups,
  getGroupMembers,
  markMessagesRead,
  getGroupUnreadCounts,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/chat";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ModalForm } from "@/components/modal-form";
import { Field } from "@/components/ui/field";
import type { CurrentUser } from "@/lib/auth/session";

type Message = {
  id: string;
  type: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  createdAt: Date;
  read: boolean;
};

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  type: "team" | "group" | "direct";
  createdAt: Date;
  memberCount: number;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  groupId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function Avatar({ name, url, size = "md" }: { name: string; url: string | null; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? 7 : size === "lg" ? 10 : 9;
  const cls = size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-10 w-10 text-sm" : "h-9 w-9 text-xs";
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${cls} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function renderContent(text: string, isMine: boolean) {
  const regex = /@\w[\w\s]*\w/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className={`font-semibold ${isMine ? "text-yellow-200" : "text-primary"}`}>
        {match[0]}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function formatTime(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function ChatClient({
  currentUser,
  initialGroups,
  allUsers,
}: {
  currentUser: CurrentUser;
  initialGroups: Group[];
  allUsers: User[];
}) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroups[0]?.id ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<{ userId: string; name: string; email: string; avatarUrl: string | null; role: string }[]>([]);
  const [nonMemberUsers, setNonMemberUsers] = useState<User[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const isGroupAdmin =
    selectedGroup?.type !== "direct" &&
    currentUser.roles?.includes("admin");

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(mentionQuery.toLowerCase()) &&
      u.id !== currentUser.id,
  );

  function loadMessagesForGroup() {
    if (!selectedGroupId) return;
    getMessages(selectedGroupId, 50).then(setMessages).catch(() => {});
  }

  function loadGroupsForUser() {
    getUserGroups().then(setGroups).catch(() => {});
  }

  function loadUnreadCounts() {
    getGroupUnreadCounts().then((counts) => {
      setUnreadCounts(new Map(counts.map((c) => [c.groupId, c.count])));
    }).catch(() => {});
  }

  function loadNotifications() {
    getNotifications(10).then(setNotifications).catch(() => {});
    getUnreadNotificationCount().then(setUnreadNotifCount).catch(() => {});
  }

  useEffect(() => {
    loadMessagesForGroup();
    loadGroupsForUser();
    loadUnreadCounts();
    loadNotifications();

    const interval = setInterval(() => {
      getMessages(selectedGroupId, 50).then(setMessages).catch(() => {});
      loadUnreadCounts();
      loadNotifications();
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) {
      markMessagesRead(selectedGroupId).catch(() => {});
    }
  }, [selectedGroupId, messages.length]);

  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isNearBottom]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 100;
    setIsNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || !selectedGroupId) return;
    setSending(true);
    const formData = new FormData();
    formData.set("content", input.trim());
    formData.set("groupId", selectedGroupId);
    try {
      await sendMessage(formData);
      setInput("");
      setIsNearBottom(true);
      inputRef.current?.focus();
      loadMessagesForGroup();
      loadGroupsForUser();
      loadUnreadCounts();
    } catch {
      // ignore
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInput(value);

    const cursor = e.target.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const atIndex = beforeCursor.lastIndexOf("@");

    if (atIndex !== -1 && (atIndex === 0 || beforeCursor[atIndex - 1] === " ")) {
      const query = beforeCursor.slice(atIndex + 1).replace(/\s/g, " ");
      if (query.length <= 20 && !query.includes(" ")) {
        setShowMentions(true);
        setMentionQuery(query);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showMentions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filteredUsers.length > 0) {
        e.preventDefault();
        insertMention(filteredUsers[mentionIndex]);
      }
    } else if (e.key === "Escape") {
      setShowMentions(false);
    }
  }

  function insertMention(user: User) {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const beforeCursor = input.slice(0, cursor);
    const atIndex = beforeCursor.lastIndexOf("@");
    const afterCursor = input.slice(cursor);
    const newValue = input.slice(0, atIndex) + `@${user.name} ` + afterCursor;
    setInput(newValue);
    setShowMentions(false);
    inputRef.current?.focus();
  }

  async function handleUnsend(messageId: string) {
    const formData = new FormData();
    formData.set("messageId", messageId);
    try {
      await deleteMessage(formData);
      loadMessagesForGroup();
    } catch {
      // ignore
    }
  }

  async function handleStartDM(otherUserId: string) {
    try {
      const result = await getOrCreateDirectMessageGroup(otherUserId);
      setSelectedGroupId(result.groupId);
      loadGroupsForUser();
      loadMessagesForGroup();
      loadUnreadCounts();
    } catch {
      // ignore
    }
  }

  async function openMembers() {
    if (!selectedGroupId || showMembers) return;
    try {
      const m = await getGroupMembers(selectedGroupId);
      setMembers(m);
      const memberIds = new Set(m.map((mm) => mm.userId));
      setNonMemberUsers(allUsers.filter((u) => !memberIds.has(u.id)));
      setShowMembers(true);
    } catch {
      // ignore
    }
  }

  async function handleAddMembers(formData: FormData) {
    formData.set("groupId", selectedGroupId);
    try {
      const { addGroupMembers } = await import("@/app/actions/chat");
      await addGroupMembers(formData);
      loadMessagesForGroup();
      await openMembers();
      loadGroupsForUser();
    } catch {
      // ignore
    }
  }

  async function handleRemoveMember(targetUserId: string) {
    if (!selectedGroupId) return;
    const formData = new FormData();
    formData.set("groupId", selectedGroupId);
    formData.set("userId", targetUserId);
    try {
      const { removeGroupMember } = await import("@/app/actions/chat");
      await removeGroupMember(formData);
      loadMessagesForGroup();
      await openMembers();
      loadGroupsForUser();
    } catch {
      // ignore
    }
  }

  async function handleLeaveGroup() {
    if (!selectedGroupId) return;
    if (!window.confirm("Leave this group?")) return;
    const formData = new FormData();
    formData.set("groupId", selectedGroupId);
    try {
      const { leaveGroup } = await import("@/app/actions/chat");
      await leaveGroup(formData);
      setSelectedGroupId(groups.filter((g) => g.id !== selectedGroupId)[0]?.id ?? "");
      loadGroupsForUser();
    } catch {
      // ignore
    }
  }

  const teamGroups = groups.filter((g) => g.type === "team" || g.type === "group");
  const dmGroups = groups.filter((g) => g.type === "direct");

  return (
    <div className="flex min-h-0 flex-1">
      {/* Group sidebar */}
      <div className="flex w-72 flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Chats</h2>
          <div className="flex items-center gap-1">
            <div className="relative" ref={notifRef}>
              <Button variant="ghost" size="icon" onClick={() => { setShowNotifications(!showNotifications); loadNotifications(); }}>
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </span>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-xl border border-border bg-card shadow-2xl">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={async () => { await markAllNotificationsRead(); loadNotifications(); }}
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
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`border-b border-border px-4 py-3 transition hover:bg-accent ${
                          n.readAt ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar name={n.actorName || "?"} url={null} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {n.actorName || "System"} · {n.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                          </div>
                          {!n.readAt && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {currentUser.roles?.includes("admin") && (
              <ModalForm
                title="Create group"
                description="Create a group chat for a project or team."
                triggerLabel=""
                triggerIcon={<Plus className="h-4 w-4" />}
                triggerVariant="ghost"
                triggerSize="icon"
                action={async (formData) => {
                  const { createChatGroup } = await import("@/app/actions/chat");
                  const result = await createChatGroup(formData);
                  setSelectedGroupId(result.groupId);
                  loadGroupsForUser();
                  loadMessagesForGroup();
                }}
                submitLabel="Create"
              >
                <Field label="Group name" name="name" required />
                <Field label="Description" name="description" />
              </ModalForm>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {teamGroups.length > 0 && (
            <div className="px-2 pt-2">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Groups
              </p>
              {teamGroups.map((group) => {
                const unread = unreadCounts.get(group.id) ?? 0;
                return (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      selectedGroupId === group.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        selectedGroupId === group.id
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{group.name}</p>
                        {unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                      {group.lastMessageContent && (
                        <p className="truncate text-xs text-muted-foreground">
                          {group.lastMessageContent}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 ${
                        selectedGroupId === group.id ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}

          <div className="px-2 pt-4">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Direct Messages
            </p>
            {allUsers
              .filter((u) => u.id !== currentUser.id)
              .map((user) => {
                const existingDm = dmGroups.find((g) =>
                  g.name.toLowerCase() === user.name.toLowerCase(),
                );
                const unread = existingDm ? unreadCounts.get(existingDm.id) ?? 0 : 0;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      if (existingDm) {
                        setSelectedGroupId(existingDm.id);
                      } else {
                        handleStartDM(user.id);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      selectedGroupId === (existingDm?.id ?? "")
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Avatar name={user.name} url={user.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        {unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                      {existingDm?.lastMessageContent && (
                        <p className="truncate text-xs text-muted-foreground">
                          {existingDm.lastMessageContent}
                        </p>
                      )}
                    </div>
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Messages area */}
      {selectedGroup && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {selectedGroup.type === "direct" ? (
                  <MessageCircle className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {selectedGroup.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedGroup.memberCount} member{selectedGroup.memberCount !== 1 ? "s" : ""}
                  {selectedGroup.description && ` · ${selectedGroup.description}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={openMembers} title="Members">
                <Users className="h-4 w-4" />
              </Button>
              {selectedGroup.type !== "direct" && (
                <Button variant="ghost" size="icon" onClick={handleLeaveGroup} title="Leave group">
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto bg-background px-4 py-4"
          >
            <div className="flex flex-col gap-2">
              {messages.map((msg, idx) => {
                if (msg.type === "system") {
                  return (
                    <div key={msg.id} className="flex justify-center py-2">
                      <span className="rounded-full bg-muted px-4 py-1.5 text-xs text-muted-foreground">
                        {msg.content}
                      </span>
                    </div>
                  );
                }
                const isMine = msg.senderId === currentUser.id;
                const nextMsg = messages[idx + 1];
                const showAvatar = !nextMsg || nextMsg.senderId !== msg.senderId || nextMsg.type === "system";
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} items-end`}>
                    {showAvatar ? (
                      <Avatar name={msg.senderName} url={msg.senderAvatar} size="sm" />
                    ) : (
                      <div className="w-7 shrink-0" />
                    )}
                    <div
                      className={`group relative min-w-0 max-w-[70%] break-words rounded-2xl px-4 py-2 shadow-sm ${
                        isMine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-card text-foreground"
                      }`}
                    >
                      <p className={`mb-0.5 text-xs font-semibold ${isMine ? "text-white/80" : "text-primary"}`}>
                        {msg.senderName}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {renderContent(msg.content, isMine)}
                      </p>
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
                        <span>{formatTime(new Date(msg.createdAt))}</span>
                        {isMine && (
                          msg.read ? <CheckCheck className="h-3 w-3 text-blue-300" /> : <Check className="h-3 w-3" />
                        )}
                      </div>
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => handleUnsend(msg.id)}
                          className="absolute right-1 top-1 hidden rounded-md p-1 text-white/50 transition hover:bg-white/20 hover:text-red-300 group-hover:block"
                          title="Unsend"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="relative bg-background px-4 pb-4 pt-2">
            {showMentions && filteredUsers.length > 0 && (
              <div className="absolute bottom-full left-4 mb-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                {filteredUsers.map((user, i) => (
                  <button
                    key={user.id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      i === mentionIndex
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                    onMouseDown={() => insertMention(user)}
                  >
                    <Avatar name={user.name} url={user.avatarUrl} size="sm" />
                    <span>{user.name}</span>
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedGroup.type === "direct"
                    ? "Type a message..."
                    : `Message #${selectedGroup.name}`
                }
                className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/80 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {!selectedGroup && (
        <div className="flex flex-1 items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Select a chat to start messaging</p>
        </div>
      )}

      {/* Members panel */}
      {showMembers && selectedGroup && (
        <div className="w-64 border-l border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Members ({members.length})
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMembers(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-y-auto px-2 py-2">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-3 rounded-lg px-3 py-2"
              >
                <Avatar name={m.name} url={m.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.role === "admin" ? "Admin" : "Member"}
                  </p>
                </div>
                {isGroupAdmin && m.role !== "admin" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.userId)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-50 hover:text-red-500"
                    title="Remove member"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {isGroupAdmin && nonMemberUsers.length > 0 && (
            <div className="border-t border-border px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Add members</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  await handleAddMembers(formData);
                  e.currentTarget.reset();
                }}
                className="flex items-center gap-2"
              >
                <select
                  name="memberIds"
                  multiple
                  className="h-20 w-full rounded-lg border border-border px-2 py-1 text-xs outline-none"
                >
                  {nonMemberUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <SubmitButton size="xs">
                  <UserPlus className="h-3 w-3" />
                  Add
                </SubmitButton>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
