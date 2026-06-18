"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatError } from "@/lib/format-error";

export function EditModal({
  title,
  description,
  action,
  submitLabel = "Save",
  formClassName = "grid gap-x-6 gap-y-5",
  children,
}: {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  formClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const closeModal = useCallback(() => {
    if (!pending) {
      setOpen(false);
      setError(null);
    }
  }, [pending]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await action(new FormData(event.currentTarget));
      setOpen(false);
      setError(null);
      toast.success(submitLabel === "Save" ? "Saved." : `${submitLabel} saved.`);
      router.refresh();
    } catch (caught) {
      const message = formatError(caught);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeModal]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} variant="outline" size="sm">
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/20">
            <div className="flex items-start justify-between gap-5 border-b border-border bg-muted/80 px-6 py-5 sm:px-7">
              <div className="flex min-w-0 gap-4">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                  <Pencil className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 id="edit-modal-title" className="text-xl font-semibold text-foreground">
                    {title}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-92px)] overflow-y-auto overflow-x-hidden">
              <form onSubmit={handleSubmit}>
                <div className={`min-w-0 p-6 sm:p-7 [&>*]:min-w-0 ${formClassName}`}>{children}</div>
                {error ? (
                  <div className="mx-6 mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
                <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-card px-6 py-4 sm:px-7">
                  <Button type="button" variant="outline" onClick={closeModal} disabled={pending}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {pending ? "Saving..." : submitLabel}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
