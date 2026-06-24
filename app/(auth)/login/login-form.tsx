"use client";

import { useActionState } from "react";
import { login, type AuthActionState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthActionState | undefined, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="grid gap-5">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        <span className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className="h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-[3px] focus:ring-sky-100"
          required
        />
        {state?.errors?.email ? (
          <span className="flex items-center gap-1 text-xs text-rose-600">
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {state.errors.email[0]}
          </span>
        ) : null}
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        <span className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className="h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-[3px] focus:ring-sky-100"
          required
        />
        {state?.errors?.password ? (
          <span className="flex items-center gap-1 text-xs text-rose-600">
            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {state.errors.password[0]}
          </span>
        ) : null}
      </label>

      {state?.message ? (
        <p className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {state.message}
        </p>
      ) : null}

      <button
        disabled={pending}
        className="relative h-11 overflow-hidden rounded-xl bg-gradient-to-r from-sky-600 to-blue-500 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition-all hover:from-sky-500 hover:to-blue-400 hover:shadow-md hover:shadow-sky-300/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Signing in...
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            Sign in
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        )}
      </button>
    </form>
  );
}
