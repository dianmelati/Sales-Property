"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveLocation, type LocationState } from "@/server/locations/actions";
import { ImagePicker } from "@/components/image-picker";

type D = { name?: string; slug?: string; city?: string; province?: string | null; description?: string | null; latitude?: string | null; longitude?: string | null };

export function LocationForm({ id, d, cover }: { id: string | null; d: D; cover: { id: string; url: string } | null }) {
  const [state, action, pending] = useActionState<LocationState, FormData>(saveLocation.bind(null, id), {});
  const e = state.errors ?? {};
  const f = (name: keyof D & string, label: string, hint?: string, type = "text") => (
    <label className="block text-xs text-mist">{label}<input name={name} type={type} step={type === "number" ? "any" : undefined} defaultValue={String(d[name] ?? "")} className="field mt-1 text-sm text-basalt" />
      {hint && !e[name] && <span className="mt-1 block text-xs">{hint}</span>}{e[name] && <span role="alert" className="mt-1 block text-xs text-brass">{e[name]}</span>}</label>
  );
  return (
    <form action={action} className="max-w-2xl space-y-8" noValidate>
      <div className="grid gap-8 sm:grid-cols-2">{f("name", "Name")}{f("city", "City")}{f("province", "Province (optional)")}{f("slug", "Web address (slug)", "Leave empty to generate from the name")}</div>
      <label className="block text-xs text-mist">Description (optional)
        <textarea name="description" rows={6} maxLength={2000} defaultValue={d.description ?? ""} className="mt-1 w-full border border-basalt/25 bg-transparent p-3 text-sm text-basalt" />
        <span className="mt-1 block text-xs">Separate paragraphs with a blank line. Write what makes the area worth living in, in your own words.</span></label>
      <ImagePicker name="coverId" label="Cover photo" initial={cover} />
      <div className="grid gap-8 sm:grid-cols-2">{f("latitude", "Latitude (optional)", undefined, "number")}{f("longitude", "Longitude (optional)", undefined, "number")}</div>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.message && <p className="text-brass">{state.message}</p>}</div>
      <div className="flex items-center gap-6 border-t border-basalt/15 pt-6"><button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : "Save location"}</button><Link href="/admin/locations" className="text-sm underline underline-offset-4">Cancel</Link></div>
    </form>
  );
}
