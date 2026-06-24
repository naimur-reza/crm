"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useFieldError } from "@/components/form-context";

export function Field({
  label,
  hint,
  error: explicitError,
  name,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const contextError = useFieldError(name ?? "");
  const error = explicitError ?? contextError;
  return (
    <div className="grid min-w-0 gap-2">
      <Label>{label}</Label>
      <input
        data-slot="input"
        name={name}
        className={cn(
          "flex h-9 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          error
            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
            : "border-input focus-visible:border-ring focus-visible:ring-ring/50",
          className,
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  error: explicitError,
  name,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  const contextError = useFieldError(name ?? "");
  const error = explicitError ?? contextError;
  return (
    <div className="grid min-w-0 gap-2">
      <Label>{label}</Label>
      <ShadcnTextarea
        name={name}
        data-invalid={error ? true : undefined}
        {...props}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function Select({
  label,
  error: explicitError,
  name,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  const contextError = useFieldError(name ?? "");
  const error = explicitError ?? contextError;
  return (
    <div className="grid min-w-0 gap-2">
      <Label>{label}</Label>
      <select
        name={name}
        {...props}
        data-invalid={error ? true : undefined}
        className={cn(
          "flex h-9 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
            : "border-input focus-visible:border-ring focus-visible:ring-ring/50",
        )}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
