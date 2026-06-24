"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  sendMessage,
  sendFileMessage,
  deleteMessage,
  getGroupMembers,
  getTypingStatus,
  emitTyping,
  emitStopTyping,
} from "@/app/actions/chat";
import { useChatRealtime } from "../_hooks/use-chat-realtime";
import { useChatMessages } from "../_hooks/use-chat-messages";
import { useCurrentUser } from "../user-context";
import { MessageList } from "../_components/message-list";
import { ChatInput } from "../_components/chat-input";
import { Avatar } from "../_components/avatar";
import type { Message } from "../_types";

type Props = {
  groupId: string;
  initialMessages: Message[];
};

export function ChatView({ groupId, initialMessages }: Props) {
  const currentUser = useCurrentUser();
  const router = useRouter();
  const {
    messages,
    loading,
    hasMore,
    loadInitial,
    loadMore,
    fetchNewMessages,
    addMessage,
    replaceTempId,
    removeMessage,
  } = useChatMessages();
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);

  useEffect(() => {
    loadInitial(groupId);
    setTypingUsers([]);
    setShowMembers(false);
  }, [groupId, loadInitial]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (!groupId) return;
    const poll = async () => {
      try {
        const [typing, _msgs] = await Promise.all([
          getTypingStatus([groupId]),
          fetchNewMessages(groupId),
        ]);
        setTypingUsers(typing.filter((r) => r.userId !== currentUser?.id));
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [groupId, currentUser?.id, fetchNewMessages]);

  useChatRealtime([groupId], {
    new_message: (data) => {
      if (data.groupId === groupId && data.message.senderId !== currentUser?.id) {
        addMessage(data.message);
      }
    },
    typing: (data) => {
      if (data.groupId === groupId && data.userId !== currentUser?.id) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, userName: data.userName }];
        });
      }
    },
    stop_typing: (data) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    },
    reconnected: () => {
      fetchNewMessages(groupId);
    },
  });

  const handleSend = async (content: string, file?: File) => {
    if (!groupId || !currentUser) return;
    if (!content && !file) return;

    if (file) {
      const tempId = crypto.randomUUID();
      const optimisticMsg: Message = {
        id: tempId,
        type: "user",
        content: `📎 ${file.name}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatarUrl,
        createdAt: new Date(),
        read: true,
        isOptimistic: true,
      };
      addMessage(optimisticMsg);

      try {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("groupId", groupId);
        formData.set("fileName", file.name);
        const result = await sendFileMessage(formData);
        replaceTempId(tempId, {
          ...optimisticMsg,
          id: result.id,
          content: `📎 ${file.name}\n${result.url}`,
          isOptimistic: false,
        });
      } catch {
        removeMessage(tempId);
        setError("File upload failed");
      }
      return;
    }

    const tempId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: tempId,
      type: "user",
      content,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      createdAt: new Date(),
      read: true,
      isOptimistic: true,
    };

    addMessage(optimisticMsg);

    try {
      const formData = new FormData();
      formData.set("content", content);
      formData.set("groupId", groupId);
      const result = await sendMessage(formData);
      replaceTempId(tempId, { ...optimisticMsg, id: result.id, isOptimistic: false });
    } catch {
      removeMessage(tempId);
      setError("Message failed to send");
    }
  };

  const handleUnsend = async (messageId: string) => {
    const formData = new FormData();
    formData.set("messageId", messageId);
    try {
      await deleteMessage(formData);
      removeMessage(messageId);
    } catch {}
  };

  const handleTyping = useCallback(() => {
    emitTyping(groupId).catch(() => {});
  }, [groupId]);

  const handleStopTyping = useCallback(() => {
    emitStopTyping(groupId).catch(() => {});
  }, [groupId]);

  const openMembers = async () => {
    if (showMembers) {
      setShowMembers(false);
      return;
    }
    try {
      const m = await getGroupMembers(groupId);
      setMembers(m);
      setShowMembers(true);
    } catch {}
  };

  const displayMessages = messages.length > 0 ? messages : initialMessages;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 flex items-center justify-between border-b border-sky-100 bg-[linear-gradient(90deg,#f1fbff_0%,#ffffff_48%,#f0fff7_100%)] px-4 py-4 shadow-[0_14px_40px_rgba(31,92,132,0.06)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/hrm/chat")}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-sky-100 hover:text-slate-700 lg:hidden"
            aria-label="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 ring-1 ring-sky-200">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
              Conversation
            </p>
            <h2 className="text-base font-black text-slate-800">Chat</h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={openMembers}
          title="Members"
          className="text-sky-600 hover:bg-sky-100 hover:text-sky-700"
        >
          <Users className="h-4 w-4" />
        </Button>
      </div>

      <MessageList
        messages={displayMessages}
        loading={loading}
        currentUserId={currentUser?.id || ""}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onUnsend={handleUnsend}
        typingNames={typingUsers.map((u) => u.userName)}
      />

      {error && (
        <div className="mx-4 mb-2 animate-in slide-in-from-bottom-2 fade-in rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-[0_4px_12px_rgba(244,63,94,0.15)]">
          {error}
        </div>
      )}

      <ChatInput
        groupName=""
        groupType="direct"
        onSend={handleSend}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
      />

      {showMembers && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setShowMembers(false)}
          />
          <div className="lg:w-64 border-l border-sky-100 bg-white/95 shadow-[0_14px_40px_rgba(31,92,132,0.08)] max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-50 max-lg:w-full max-lg:max-w-sm max-lg:shadow-xl">
            <div className="flex items-center justify-between border-b border-sky-100 px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-600">
                  Room
                </p>
                <h3 className="text-sm font-black text-slate-800">
                  Members ({members.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMembers(false)}
                className="text-sky-500 hover:bg-sky-100 hover:text-sky-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto px-3 py-3">
              {members.map((m: any) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-700 transition hover:bg-sky-50/50"
                >
                  <Avatar name={m.name} url={m.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {m.name}
                    </p>
                    <p className="truncate text-xs font-semibold text-sky-600">
                      {m.role === "admin" ? "Admin" : "Member"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
