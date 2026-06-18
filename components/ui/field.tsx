import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        {...props}
        className="h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {hint ? <span className="text-xs font-normal leading-5 text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <textarea
        {...props}
        className="min-h-28 w-full min-w-0 rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        {...props}
        className="h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        {children}
      </select>
    </label>
  );
}
