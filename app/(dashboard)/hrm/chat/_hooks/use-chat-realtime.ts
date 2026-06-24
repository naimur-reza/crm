"use client";

import { useEffect, useRef } from "react";
import type { Message } from "../_types";

type EventCallback = {
  new_message?: (data: { groupId: string; message: Message }) => void;
  message_read?: (data: { groupId: string; userId: string; messageId: string }) => void;
  typing?: (data: { groupId: string; userId: string; userName: string }) => void;
  stop_typing?: (data: { groupId: string; userId: string }) => void;
  presence?: (data: { userId: string; status: "online" | "offline"; lastSeen: string }) => void;
  unread_update?: (data: { groupId: string; count: number }) => void;
  notification?: (data: any) => void;
  reconnected?: (groupIds: string[]) => void;
};

export function useChatRealtime(
  groupIds: string[],
  callbacks: EventCallback,
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const groupIdsRef = useRef(groupIds);
  groupIdsRef.current = groupIds;

  const stableKey = groupIds.join(",");

  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (groupIds.length === 0) return;

    const params = new URLSearchParams({ groupIds: stableKey });
    const es = new EventSource(`/api/chat/events?${params}`);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      callbacksRef.current.reconnected?.(groupIdsRef.current);
    });

    es.addEventListener("new_message", (e) => {
      const data = JSON.parse(e.data);
      callbacksRef.current.new_message?.(data);
    });

    es.addEventListener("message_read", (e) => {
      const data = JSON.parse(e.data);
      callbacksRef.current.message_read?.(data);
    });

    es.addEventListener("typing", (e) => {
      const data = JSON.parse(e.data);
      callbacksRef.current.typing?.(data);
    });

    es.addEventListener("stop_typing", (e) => {
      const data = JSON.parse(e.data);
      callbacksRef.current.stop_typing?.(data);
    });

    es.addEventListener("presence", (e) => {
      const data = JSON.parse(e.data);
      callbacksRef.current.presence?.(data);
    });

    es.addEventListener("unread_update", (e) => {
      const data = JSON.parse(e.data);
      callbacksRef.current.unread_update?.(data);
    });

    es.addEventListener("notification", (e) => {
      const data = JSON.parse(e.data);
      callbacksRef.current.notification?.(data);
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        const ids = groupIdsRef.current;
        if (ids.length === 0) return;
        const p = new URLSearchParams({ groupIds: ids.join(",") });
        const newEs = new EventSource(`/api/chat/events?${p}`);
        eventSourceRef.current = newEs;

        newEs.addEventListener("connected", () => {
          callbacksRef.current.reconnected?.(ids);
        });
        newEs.addEventListener("new_message", (e) => {
          callbacksRef.current.new_message?.(JSON.parse(e.data));
        });
        newEs.addEventListener("message_read", (e) => {
          callbacksRef.current.message_read?.(JSON.parse(e.data));
        });
        newEs.addEventListener("typing", (e) => {
          callbacksRef.current.typing?.(JSON.parse(e.data));
        });
        newEs.addEventListener("stop_typing", (e) => {
          callbacksRef.current.stop_typing?.(JSON.parse(e.data));
        });
        newEs.addEventListener("presence", (e) => {
          callbacksRef.current.presence?.(JSON.parse(e.data));
        });
        newEs.addEventListener("unread_update", (e) => {
          callbacksRef.current.unread_update?.(JSON.parse(e.data));
        });
        newEs.addEventListener("notification", (e) => {
          callbacksRef.current.notification?.(JSON.parse(e.data));
        });
        newEs.onerror = es.onerror;
      }, 3000);
    };

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      es.close();
      if (eventSourceRef.current === es) eventSourceRef.current = null;
    };
  }, [stableKey]);
}
