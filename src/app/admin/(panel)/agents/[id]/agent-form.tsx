"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveAgent, type AgentFormState } from "@/server/agents/actions";
import { ImagePicker } from "@/components/image-picker";

type D = { name?: string; slug?: string; title?: string | null; bio?: string | null; phone?: string | null; email?: string | null; userId?: string | null; isFeatured?: boolean; isActive?: boolean };

export function AgentForm({ id, d, photo, accounts }: { id: string | null; d: D; photo: { id: string; url: string } | null; accounts: { id: string; label: string }[] | null }) {
  const [state, action, pending] = useActionState<AgentFormState, FormData>(saveAgent.bind(null, id), {});
  const e = state.errors ?? {};
  const f = (name: keyof D & string, label: string, hint?: string, type = "text") => (
    <label className="block text-xs text-mist">{label}
      <input name={name} type={type} defaultValue={String(d[name] ?? "")} className="field mt-1 text-sm text-basalt" />
      {hint && !e[name] && <span className="mt-1 block text-xs">{hint}</span>}
      {e[name] && <span role="alert" className="mt-1 block text-xs text-brass">{e[name]}</span>}
    </label>
  );
  return (
    <form action={action} className="max-w-2xl space-y-8" noValidate>
      <div className="grid gap-8 sm:grid-cols-2">
        {f("name", "Full name")}{f("title", "Job title (optional)", "For example: Senior property consultant")}
        {f("phone", "Phone", undefined, "tel")}{f("email", "Email", undefined, "email")}
      </div>
      {f("slug", "Web address (slug)", "Leave empty to generate from the name")}
      <label className="block text-xs text-mist">Short biography (optional)
        <textarea name="bio" rows={5} maxLength={1500} defaultValue={d.bio ?? ""} className="mt-1 w-full border border-basalt/25 bg-transparent p-3 text-sm text-basalt" />
        {e.bio && <span role="alert" className="mt-1 block text-xs text-brass">{e.bio}</span>}
      </label>
      <ImagePicker name="photoId" label="Photo" initial={photo} />
      {e.photoId && <p role="alert" className="text-xs text-brass">{e.photoId}</p>}
      {accounts && (
        <label className="block text-xs text-mist">Login account
          <select name="userId" defaultValue={d.userId ?? ""} className="field mt-1 text-sm text-basalt"><option value="">Not linked</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
          <span className="mt-1 block text-xs">A linked agent account can only see leads assigned to this agent.</span>
          {e.userId && <span role="alert" className="mt-1 block text-xs text-brass">{e.userId}</span>}
        </label>
      )}
      <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={d.isActive ?? true} /> Active (can be assigned and shown on the website)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={d.isFeatured ?? false} /> Featured on the homepage</label>
      </div>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.message && <p className="text-brass">{state.message}</p>}</div>
      <div className="flex items-center gap-6 border-t border-basalt/15 pt-6">
        <button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : "Save agent"}</button>
        <Link href="/admin/agents" className="text-sm underline underline-offset-4">Cancel</Link>
      </div>
    </form>
  );
}
