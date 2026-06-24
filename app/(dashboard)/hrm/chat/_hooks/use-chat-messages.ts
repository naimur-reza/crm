"use client";

import { useState, useCallback, useRef } from "react";
import { getMessages, getMessagesBefore } from "@/app/actions/chat";
import type { Message } from "../_types";

type UseChatMessagesReturn = {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  loadInitial: (groupId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchNewMessages: (groupId: string) => Promise<void>;
  addMessage: (msg: Message) => void;
  replaceTempId: (tempId: string, realMsg: Message) => void;
  removeMessage: (id: string) => void;
  markReadOptimistic: (groupId: string) => void;
};

export function useChatMessages(): UseChatMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadedGroupRef = useRef<string>("");
  const lastKnownTimestampRef = useRef<Date | null>(null);

  const loadInitial = useCallback(async (groupId: string) => {
    if (loadedGroupRef.current === groupId) return;
    loadedGroupRef.current = groupId;
    lastKnownTimestampRef.current = null;
    setLoading(true);
    setMessages([]);
    setHasMore(true);
    try {
      const result = await getMessages(groupId, 50);
      setMessages(result);
      setHasMore(result.length >= 50);
      if (result.length > 0) {
        lastKnownTimestampRef.current = result[result.length - 1].createdAt;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    setLoading(true);
    try {
      const older = await getMessagesBefore(loadedGroupRef.current, oldest.createdAt, 50);
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
        setHasMore(older.length >= 50);
      } else {
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, messages]);

  const fetchNewMessages = useCallback(async (groupId: string) => {
    if (groupId !== loadedGroupRef.current || !lastKnownTimestampRef.current) return;
    try {
      const newMsgs = await getMessages(groupId, 50, lastKnownTimestampRef.current);
      if (newMsgs.length > 0) {
        lastKnownTimestampRef.current = newMsgs[newMsgs.length - 1].createdAt;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const toAdd = newMsgs.filter((m) => !existingIds.has(m.id));
          if (toAdd.length === 0) return prev;
          return [...prev, ...toAdd];
        });
      }
    } catch {
      // silent
    }
  }, []);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      if (msg.createdAt > (lastKnownTimestampRef.current ?? new Date(0))) {
        lastKnownTimestampRef.current = msg.createdAt;
      }
      return [...prev, msg];
    });
  }, []);

  const replaceTempId = useCallback((tempId: string, realMsg: Message) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? realMsg : m)),
    );
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const markReadOptimistic = useCallback((groupId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.senderId !== loadedGroupRef.current ? { ...m, read: true } : m,
      ),
    );
  }, []);

  return {
    messages,
    loading,
    hasMore,
    loadInitial,
    loadMore,
    fetchNewMessages,
    addMessage,
    replaceTempId,
    removeMessage,
    markReadOptimistic,
  };
}