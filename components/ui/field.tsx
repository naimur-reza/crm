import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        {...props}
        className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#3995d2] focus:ring-2 focus:ring-[#3995d2]/15"
      />
      {hint ? <span className="text-xs font-normal leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <textarea
        {...props}
        className="min-h-28 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#3995d2] focus:ring-2 focus:ring-[#3995d2]/15"
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
    <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <select
        {...props}
        className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#3995d2] focus:ring-2 focus:ring-[#3995d2]/15"
      >
        {children}
      </select>
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex h-10 items-center justify-center rounded-lg bg-[#3995d2] px-4 text-sm font-semibold text-white transition hover:bg-[#2f80bd]">
      {children}
    </button>
  );
}
