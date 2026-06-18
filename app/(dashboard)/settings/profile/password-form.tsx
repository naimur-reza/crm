"use client";

import { useFormState } from "react-dom";
import { Key } from "lucide-react";
import { updateProfilePassword } from "@/app/actions/profile";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState = {
  error: null as string | null,
  success: false,
};

async function passwordAction(prev: typeof initialState, formData: FormData) {
  try {
    await updateProfilePassword(formData);
    return { error: null, success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update password.", success: false };
  }
}

export function ProfilePasswordForm() {
  const [state, formAction] = useFormState(passwordAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-foreground">
        <span>Current Password</span>
        <input
          name="currentPassword"
          type="password"
          required
          className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-foreground">
        <span>New Password</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>
      {state.error && (
        <p className="text-sm text-rose-600">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-600">Password updated successfully.</p>
      )}
      <div>
        <SubmitButton pendingLabel="Updating..."><Key className="h-4 w-4" /> Update Password</SubmitButton>
      </div>
    </form>
  );
}
