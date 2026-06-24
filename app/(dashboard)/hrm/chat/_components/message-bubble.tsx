"use client";

import { Check, CheckCheck, Download, FileText, Image, Trash2 } from "lucide-react";
import { Avatar } from "./avatar";
import type { Message } from "../_types";

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url);
}

function parseFileContent(content: string) {
  if (!content.startsWith("📎 ")) return null;
  const newlineIdx = content.indexOf("\n");
  if (newlineIdx === -1) return null;
  const name = content.slice(2, newlineIdx).trim();
  const url = content.slice(newlineIdx + 1).trim();
  if (!url || !name) return null;
  return { name, url, isImage: isImageUrl(url) };
}

function renderContent(text: string, isMine: boolean) {
  const regex = /@\w[\w\s]*\w/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <span key={match.index} className={`font-semibold ${isMine ? "text-blue-200" : "text-primary"}`}>
        {match[0]}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

function formatTime(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function formatDateSeparator(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

type Props = {
  msg: Message;
  isMine: boolean;
  isOptimistic: boolean;
  showAvatar: boolean;
  showDateSep: boolean;
  onUnsend: (id: string) => void;
};

export function MessageBubble({ msg, isMine, isOptimistic, showAvatar, showDateSep, onUnsend }: Props) {
  if (msg.type === "system") {
    return (
      <div key={msg.id}>
        {showDateSep && <DateSeparator date={msg.createdAt} />}
        <div className="flex justify-center py-2">
          <span className="rounded-full bg-sky-50 px-4 py-1.5 text-xs font-medium text-sky-600 ring-1 ring-sky-200">
            {msg.content}
          </span>
        </div>
      </div>
    );
  }

  const attachment = parseFileContent(msg.content);

  return (
    <div key={msg.id}>
      {showDateSep && <DateSeparator date={msg.createdAt} />}
      <div className={`flex gap-2.5 ${isMine ? "flex-row-reverse" : "flex-row"} items-end mb-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200`}>
        <div className={`transition-opacity ${showAvatar ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          {showAvatar && <Avatar name={msg.senderName} url={msg.senderAvatar} size="sm" />}
        </div>
        <div
          className={`group relative min-w-0 max-w-[75%] break-words rounded-2xl px-4 py-2.5 ${
            isMine
              ? "rounded-br-md bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.25)]"
              : "rounded-bl-md bg-white text-slate-800 shadow-[0_4px_12px_rgba(31,92,132,0.08)] ring-1 ring-sky-100"
          } ${isOptimistic ? "opacity-70" : ""}`}
        >
          {!isMine && (
            <p className="mb-0.5 text-xs font-bold text-sky-600">
              {msg.senderName}
            </p>
          )}
          {attachment ? (
            <div className="min-w-0">
              {attachment.isImage ? (
                <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="max-w-full rounded-lg object-cover"
                    style={{ maxHeight: "300px" }}
                    loading="lazy"
                  />
                </a>
              ) : (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 rounded-xl p-3 transition ${
                    isMine
                      ? "bg-white/20 hover:bg-white/30"
                      : "bg-sky-50 hover:bg-sky-100 ring-1 ring-sky-200"
                  }`}
                >
                  <FileText className={`h-8 w-8 shrink-0 ${isMine ? "text-white/70" : "text-sky-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold ${isMine ? "text-white" : "text-slate-800"}`}>{attachment.name}</p>
                    <p className={`text-xs font-medium ${isMine ? "text-white/60" : "text-sky-600"}`}>Click to download</p>
                  </div>
                  <Download className={`h-4 w-4 shrink-0 ${isMine ? "text-white/50" : "text-sky-400"}`} />
                </a>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {renderContent(msg.content, isMine)}
            </p>
          )}
          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isMine ? "text-white/70" : "text-slate-400"}`}>
            <span>{formatTime(new Date(msg.createdAt))}</span>
            {isMine && (
              msg.read
                ? <CheckCheck className="h-3 w-3 text-green-300" />
                : <Check className="h-3 w-3" />
            )}
            {isOptimistic && <span className="ml-1 italic text-white/60">{attachment ? "uploading..." : "sending..."}</span>}
          </div>
          {isMine && !isOptimistic && (
            <button
              type="button"
              onClick={() => onUnsend(msg.id)}
              className="absolute right-1 top-1 hidden rounded-md p-1 text-white/50 transition hover:bg-white/20 hover:text-rose-300 group-hover:block"
              title="Unsend"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="mb-4 mt-2 flex items-center gap-3">
      <div className="flex-1 border-t border-sky-100" />
      <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600 ring-1 ring-sky-200">
        {formatDateSeparator(new Date(date))}
      </span>
      <div className="flex-1 border-t border-sky-100" />
    </div>
  );
}
