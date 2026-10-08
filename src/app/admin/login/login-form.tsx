"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-8" noValidate>
      <label className="block text-xs text-mist">
        Email
        <input name="email" type="email" autoComplete="username" required className="field mt-1 text-basalt" />
      </label>
      <label className="block text-xs text-mist">
        Password
        <input name="password" type="password" autoComplete="current-password" required className="field mt-1 text-basalt" />
      </label>
      {state.error && (
        <p role="alert" className="border-l-2 border-brass pl-3 text-sm">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
