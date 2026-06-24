"use client";

import { useRef, useState } from "react";
import type { z } from "zod/v4";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormProvider } from "@/components/form-context";
import { formatError } from "@/lib/format-error";

export function ModalForm({
  title,
  description,
  triggerLabel,
  triggerIcon,
  triggerVariant,
  triggerSize,
  triggerClassName,
  triggerTitle,
  action,
  submitLabel,
  formClassName = "grid gap-x-6 gap-y-5",
  schema,
  children,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  triggerSize?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  triggerClassName?: string;
  triggerTitle?: string;
  action?: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  formClassName?: string;
  schema?: z.ZodTypeAny;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!action) return;
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (schema) {
      const result = schema.safeParse(Object.fromEntries(formData));
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const path = issue.path.join(".");
          if (!fieldErrors[path]) fieldErrors[path] = issue.message;
        }
        const firstError = Object.values(fieldErrors)[0];
        setError(firstError ?? "Validation failed.");
        toast.error(firstError ?? "Validation failed.");
        return;
      }
    }

    setPending(true);
    setError(null);
    try {
      await action(formData);
      form.reset();
      setOpen(false);
      setError(null);
      toast.success(`${submitLabel ?? triggerLabel} saved.`);
      router.refresh();
    } catch (caught) {
      const message = formatError(caught);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) setOpen(v); }}>
      <DialogTrigger
        render={<Button variant={triggerVariant} size={triggerSize} className={triggerClassName} title={triggerTitle} />}
      >
        {triggerIcon ?? <Plus className="h-4 w-4" />}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {action ? (
          <FormProvider schema={schema}>
            <form ref={formRef} onSubmit={handleSubmit}>
              <div className={`px-1 [&>*]:min-w-0 ${formClassName}`}>{children}</div>
              {error ? (
                <div className="mt-4 flex gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {pending ? "Saving..." : submitLabel ?? triggerLabel}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        ) : (
          <div>{children}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
