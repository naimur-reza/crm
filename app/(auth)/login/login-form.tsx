"use client";

import { useActionState } from "react";
import { login, type AuthActionState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthActionState | undefined, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          required
        />
        {state?.errors?.email ? (
          <span className="text-xs text-red-600">{state.errors.email[0]}</span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          required
        />
        {state?.errors?.password ? (
          <span className="text-xs text-red-600">{state.errors.password[0]}</span>
        ) : null}
      </label>
      {state?.message ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="h-11 rounded-md bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
