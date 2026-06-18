"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatError } from "@/lib/format-error";

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
      toast.error(formatError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="destructive" disabled={pending} onClick={handleDelete}>
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting..." : label}
    </Button>
  );
}
