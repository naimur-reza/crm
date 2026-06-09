"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function DeleteButton({
  action,
  id,
  label = "Delete",
  confirmMessage,
  redirectTo,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label?: string;
  confirmMessage: string;
  redirectTo: string;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return;
    const formData = new FormData();
    formData.set("id", id);
    setPending(true);
    try {
      await action(formData);
      toast.success(`${label} completed.`);
      router.push(redirectTo);
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Delete failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting..." : label}
    </button>
  );
}
