"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";

export function ToastActionForm({
  action,
  successMessage,
  className,
  resetOnSuccess = false,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  successMessage: string;
  className?: string;
  resetOnSuccess?: boolean;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      className={className}
      action={async (formData) => {
        try {
          await action(formData);
          if (resetOnSuccess) formRef.current?.reset();
          toast.success(successMessage);
          router.refresh();
        } catch (caught) {
          toast.error(formatError(caught));
        }
      }}
    >
      {children}
    </form>
  );
}
