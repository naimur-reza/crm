"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
          toast.error(caught instanceof Error ? caught.message : "Something went wrong.");
        }
      }}
    >
      {children}
    </form>
  );
}
