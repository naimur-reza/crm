"use client";

import { useRef, useState } from "react";
import { Loader2, Send, Paperclip, X } from "lucide-react";

type Props = {
  groupName: string;
  groupType: string;
  onSend: (content: string, file?: File) => Promise<void>;
  onTyping: () => void;
  onStopTyping: () => void;
};

export function ChatInput({ groupName, groupType, onSend, onTyping, onStopTyping }: Props) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const typingThrottleRef = useRef(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    const now = Date.now();
    if (now - typingThrottleRef.current > 1000) {
      typingThrottleRef.current = now;
      onTyping();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(onStopTyping, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !file) || sending) return;
    setSending(true);
    try {
      await onSend(input.trim(), file ?? undefined);
      setInput("");
      setFile(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative border-t border-sky-100 bg-white/95 px-4 pb-4 pt-3 shadow-[0_-4px_12px_rgba(31,92,132,0.04)]">
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm shadow-sm">
          <Paperclip className="h-3.5 w-3.5 text-sky-500" />
          <span className="flex-1 truncate font-semibold text-slate-700">{file.name}</span>
          <span className="text-xs font-medium text-sky-600">{(file.size / 1024).toFixed(1)} KB</span>
          <button type="button" onClick={() => setFile(null)} className="text-sky-400 hover:text-rose-500 transition">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-sky-400 transition hover:bg-sky-100 hover:text-sky-600 ring-1 ring-sky-200">
          <Paperclip className="h-4 w-4" />
          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder={
              groupType === "direct"
                ? "Type a message..."
                : `Message #${groupName}`
            }
            className="w-full rounded-2xl border border-sky-200 bg-sky-50/50 px-4 py-3 pr-12 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
            disabled={sending}
          />
          {sending && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sky-500" />
          )}
        </div>
        <button
          type="submit"
          disabled={(!input.trim() && !file) || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_6px_16px_rgba(59,130,246,0.4)] hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
