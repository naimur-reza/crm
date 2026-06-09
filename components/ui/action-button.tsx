"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function ActionButton({
  children,
  pendingLabel = "Saving...",
  size = "sm",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  size?: "xs" | "sm";
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const sizeClass = size === "xs" ? "h-8 px-3 text-xs" : "h-9 px-3 text-sm";
  const variantClass =
    variant === "primary"
      ? "bg-[#3995d2] text-white hover:bg-[#2f80bd]"
      : "border border-slate-300 bg-white text-slate-700 hover:border-[#3995d2] hover:text-[#3995d2]";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass} ${variantClass}`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
