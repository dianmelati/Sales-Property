"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { CmsState } from "@/server/cms/actions";

type Field = { name: string; label: string; area?: boolean; value: string; hint?: string };

/** Form bersama untuk testimoni dan FAQ. `action` sudah diikat ke id (atau null untuk entri baru). */
export function EntryForm({ action, fields, visible, backHref, submitLabel }: {
  action: (s: CmsState, fd: FormData) => Promise<CmsState>; fields: Field[]; visible: boolean; backHref: string; submitLabel: string;
}) {
  const [state, run, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  return (
    <form action={run} className="max-w-2xl space-y-8" noValidate>
      {fields.map((f) => (
        <label key={f.name} className="block text-xs text-mist">{f.label}
          {f.area
            ? <textarea name={f.name} rows={5} defaultValue={f.value} className="mt-1 w-full border border-basalt/25 bg-transparent p-3 text-sm text-basalt" />
            : <input name={f.name} defaultValue={f.value} className="field mt-1 text-sm text-basalt" />}
          {f.hint && !e[f.name] && <span className="mt-1 block text-xs">{f.hint}</span>}
          {e[f.name] && <span role="alert" className="mt-1 block text-xs text-brass">{e[f.name]}</span>}
        </label>
      ))}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isVisible" defaultChecked={visible} /> Show on the website</label>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.message && <p className="text-brass">{state.message}</p>}</div>
      <div className="flex items-center gap-6 border-t border-basalt/15 pt-6">
        <button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : submitLabel}</button>
        <Link href={backHref} className="text-sm underline underline-offset-4">Cancel</Link>
      </div>
    </form>
  );
}
