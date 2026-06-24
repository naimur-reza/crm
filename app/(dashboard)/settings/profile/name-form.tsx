"use client";

import { useActionState } from "react";
import { updateProfileName } from "@/app/actions/profile";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState = { error: null as string | null };

async function nameAction(prev: typeof initialState, formData: FormData) {
  try {
    await updateProfileName(formData);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update name." };
  }
}

export function ProfileNameForm({ currentName }: { currentName: string }) {
  const [state, formAction] = useActionState(nameAction, initialState);

  function handleSubmit(formData: FormData) {
    formAction(formData);
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-foreground">
        <span>Full Name</span>
        <input
          name="name"
          type="text"
          defaultValue={currentName}
          required
          className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>
      {state.error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
      )}
      <div>
        <SubmitButton>Save Name</SubmitButton>
      </div>
    </form>
  );
}
