"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import type { Message } from "../_types";

type Props = {
  messages: Message[];
  loading: boolean;
  currentUserId: string;
  hasMore: boolean;
  onLoadMore: () => void;
  onUnsend: (id: string) => void;
  typingNames: string[];
};

export function MessageList({ messages, loading, currentUserId, hasMore, onLoadMore, onUnsend, typingNames }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const prevMessageCount = useRef(messages.length);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 100;
    setIsNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);

    if (el.scrollTop < 50 && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  useEffect(() => {
    if (isNearBottom && messages.length > prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages, isNearBottom]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [loading]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          <p className="text-sm font-semibold text-sky-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 ring-1 ring-sky-200">
            <MessageSquare className="h-8 w-8 text-sky-400" />
          </div>
          <p className="mt-4 text-sm font-bold text-slate-800">No messages yet</p>
          <p className="mt-1 text-xs font-medium text-slate-400">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4"
    >
      {loading && hasMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
        </div>
      )}
      <div className="mx-auto max-w-3xl">
        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const showDateSep =
            idx === 0 ||
            new Date(msg.createdAt).toDateString() !== new Date(prevMsg?.createdAt ?? 0).toDateString();
          const isMine = msg.senderId === currentUserId;
          const nextMsg = messages[idx + 1];
          const showAvatar = !nextMsg || nextMsg.senderId !== msg.senderId || nextMsg.type === "system";

          return (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={isMine}
              isOptimistic={msg.isOptimistic === true}
              showAvatar={showAvatar}
              showDateSep={showDateSep}
              onUnsend={onUnsend}
            />
          );
        })}
      </div>
      <TypingIndicator names={typingNames} />
      <div ref={bottomRef} />
    </div>
  );
}
