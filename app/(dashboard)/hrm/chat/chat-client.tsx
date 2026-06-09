"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { sendMessage, getMessages, deleteMessage } from "@/app/actions/chat";
import type { CurrentUser } from "@/lib/auth/session";

type Message = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
};

type User = {
  id: string;
  name: string;
  email: string;
};

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
      <span key={match.index} className={`font-semibold ${isMine ? "text-yellow-200" : "text-[#3995d2]"}`}>
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

export function ChatClient({
  currentUser,
  initialMessages,
  allUsers,
}: {
  currentUser: CurrentUser;
  initialMessages: Message[];
  allUsers: User[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(mentionQuery.toLowerCase()) &&
      u.id !== currentUser.id,
  );

  async function loadMessages() {
    const msgs = await getMessages(50);
    setMessages(msgs);
  }

  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isNearBottom]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 100;
    setIsNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const formData = new FormData();
    formData.set("content", input.trim());
    try {
      await sendMessage(formData);
      setInput("");
      setIsNearBottom(true);
      inputRef.current?.focus();
      await loadMessages();
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
      await loadMessages();
    } catch {
      // ignore
    }
  }

  function formatMessageTime(date: Date) {
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

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div className="flex flex-col gap-2">
          {messages.map((msg) => {
            const isMine = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`group relative min-w-0 max-w-[75%] break-words rounded-2xl px-4 py-2 shadow-sm ${
                    isMine
                      ? "rounded-br-md bg-[#3995d2] text-white"
                      : "rounded-bl-md bg-white text-slate-950"
                  }`}
                >
                  <p className={`mb-0.5 text-xs font-semibold ${isMine ? "text-white/80" : "text-[#3995d2]"}`}>
                    {msg.senderName}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {renderContent(msg.content, isMine)}
                  </p>
                  <p className={`mt-1 text-right text-[10px] ${isMine ? "text-white/60" : "text-slate-400"}`}>
                    {formatMessageTime(new Date(msg.createdAt))}
                  </p>
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

      <div className="relative bg-slate-100 px-4 pb-4 pt-2">
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-4 mb-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {filteredUsers.map((user, i) => (
              <button
                key={user.id}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                  i === mentionIndex
                    ? "bg-[#3995d2] text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onMouseDown={() => insertMention(user)}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                  {user.name.charAt(0).toUpperCase()}
                </span>
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
            placeholder="Type a message..."
            className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3995d2] focus:ring-1 focus:ring-[#3995d2]"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3995d2] text-white transition hover:bg-[#2f80bd] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
