"use client";

import { useActionState } from "react";
import { savePageContent, type PageState } from "@/server/cms/page-actions";
import { ImagePicker } from "@/components/image-picker";

export function PageForm({ pageKey, d, image }: { pageKey: "about" | "contact"; d: { headline: string; body?: string; intro?: string }; image: { id: string; url: string } | null }) {
  const [state, action, pending] = useActionState<PageState, FormData>(savePageContent.bind(null, pageKey), {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="max-w-2xl space-y-8" noValidate>
      <label className="block text-xs text-mist">Headline<input name="headline" defaultValue={d.headline} className="field mt-1 text-sm text-basalt" />{e.headline && <span role="alert" className="mt-1 block text-xs text-brass">{e.headline}</span>}</label>
      {pageKey === "about" ? (<>
        <label className="block text-xs text-mist">Text
          <textarea name="body" rows={12} defaultValue={d.body} className="mt-1 w-full border border-basalt/25 bg-transparent p-3 text-sm text-basalt" />
          <span className="mt-1 block text-xs">Separate paragraphs with a blank line.</span>{e.body && <span role="alert" className="block text-xs text-brass">{e.body}</span>}</label>
        <ImagePicker name="imageId" label="Photo (optional)" initial={image} />
      </>) : (
        <label className="block text-xs text-mist">Introduction
          <textarea name="intro" rows={4} maxLength={400} defaultValue={d.intro} className="mt-1 w-full border border-basalt/25 bg-transparent p-3 text-sm text-basalt" />{e.intro && <span role="alert" className="block text-xs text-brass">{e.intro}</span>}</label>
      )}
      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.message && <p className={state.errors ? "text-brass" : "text-moss"}>{state.message}</p>}</div>
      <div className="border-t border-basalt/15 pt-6"><button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : "Save page"}</button></div>
    </form>
  );
}
