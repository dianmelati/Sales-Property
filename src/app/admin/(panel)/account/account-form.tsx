"use client";

import { useActionState } from "react";
import { changeOwnPassword, type AccountState } from "@/server/users/account-actions";

export function AccountForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changeOwnPassword, {});
  const e = state.errors ?? {};
  const f = (name: string, label: string, ac: string) => (
    <label className="block text-xs text-mist">{label}
      <input name={name} type="password" autoComplete={ac} aria-invalid={!!e[name]} className="field mt-1 text-sm text-basalt" />
      {e[name] && <span role="alert" className="mt-1 block text-xs text-brass">{e[name]}</span>}
    </label>
  );
  return (
    <form action={action} className="max-w-md space-y-7" noValidate>
      {f("current", "Current password", "current-password")}
      {f("next", "New password", "new-password")}
      {f("confirm", "Repeat the new password", "new-password")}
      <p className="text-xs text-mist">At least 10 characters. Changing it signs you out on every other device.</p>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.message && <p className={state.saved ? "text-moss" : "text-brass"}>{state.message}</p>}</div>
      <button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : "Change password"}</button>
    </form>
  );
}
