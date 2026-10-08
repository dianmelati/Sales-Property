"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveUser, type UserFormState } from "@/server/users/actions";

type D = { name?: string; email?: string; role?: string; isActive?: boolean };

export function UserForm({ id, d, isSelf }: { id: string | null; d: D; isSelf: boolean }) {
  const [state, action, pending] = useActionState<UserFormState, FormData>(saveUser.bind(null, id), {});
  const e = state.errors ?? {};
  const err = (n: string) => e[n] && <span role="alert" className="mt-1 block text-xs text-brass">{e[n]}</span>;
  return (
    <form action={action} className="max-w-xl space-y-8" noValidate>
      <label className="block text-xs text-mist">Full name<input name="name" defaultValue={d.name} className="field mt-1 text-sm text-basalt" />{err("name")}</label>
      <label className="block text-xs text-mist">Email (used to sign in)<input name="email" type="email" defaultValue={d.email} autoComplete="off" className="field mt-1 text-sm text-basalt" />{err("email")}</label>
      <label className="block text-xs text-mist">Role
        <select name="role" defaultValue={d.role ?? "EDITOR"} disabled={isSelf} className="field mt-1 text-sm text-basalt">
          <option value="SUPER_ADMIN">Super admin: everything, including users</option>
          <option value="ADMIN">Admin: everything except users</option>
          <option value="EDITOR">Editor: properties, media, content, SEO</option>
          <option value="AGENT">Agent: own leads only</option>
        </select>
        {isSelf && <input type="hidden" name="role" value={d.role} />}
        {err("role")}
      </label>
      <label className="block text-xs text-mist">{id ? "New password (leave empty to keep the current one)" : "Password"}
        <input name="password" type="password" autoComplete="new-password" className="field mt-1 text-sm text-basalt" />
        <span className="mt-1 block text-xs">At least 10 characters. {id ? "Changing it signs the user out everywhere." : "Share it with the user privately."}</span>
        {err("password")}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={d.isActive ?? true} disabled={isSelf} />{isSelf && <input type="hidden" name="isActive" value="on" />} Active (can sign in)
      </label>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.message && <p className="text-brass">{state.message}</p>}</div>
      <div className="flex items-center gap-6 border-t border-basalt/15 pt-6">
        <button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : "Save user"}</button>
        <Link href="/admin/users" className="text-sm underline underline-offset-4">Cancel</Link>
      </div>
    </form>
  );
}
