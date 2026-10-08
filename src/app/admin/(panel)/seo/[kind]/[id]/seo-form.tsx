"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveSeo, type SeoState } from "@/server/seo/actions";
import { ImagePicker } from "@/components/image-picker";

type D = { title: string; description: string; keywords: string; canonical: string; noIndex: boolean };

export function SeoForm({ kind, id, d, og, url, fallbackTitle, fallbackDescription }: {
  kind: "page" | "location"; id: string; d: D; og: { id: string; url: string } | null; url: string; fallbackTitle: string; fallbackDescription: string;
}) {
  const [state, action, pending] = useActionState<SeoState, FormData>(saveSeo.bind(null, kind, id), {});
  const [title, setTitle] = useState(d.title);
  const [desc, setDesc] = useState(d.description);
  const e = state.errors ?? {};
  const T = title || fallbackTitle, D = desc || fallbackDescription;
  const tone = (n: number, lo: number, hi: number) => (n === 0 ? "text-mist" : n >= lo && n <= hi ? "text-moss" : "text-brass");

  return (
    <form action={action} className="max-w-2xl space-y-8" noValidate>
      <figure aria-label="Search result preview" className="border border-basalt/15 p-5">
        <p className="truncate text-xs text-mist">{url}</p>
        <p className="mt-1 line-clamp-1 font-sans text-xl text-moss">{T.slice(0, 70)}</p>
        <p className="mt-1 line-clamp-2 text-sm text-mist">{D.slice(0, 170)}</p>
        <figcaption className="mt-3 text-xs text-mist">Preview only. Search engines may choose different text. The site name is added after the title automatically.</figcaption>
      </figure>

      <label className="block text-xs text-mist">Title
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={70} placeholder={fallbackTitle} className="field mt-1 text-sm text-basalt" />
        <span className={`mt-1 block text-xs ${tone(title.length, 30, 60)}`}>{title.length}/70 · aim for 30 to 60 characters. Empty uses: {fallbackTitle}</span>
        {e.title && <span role="alert" className="block text-xs text-brass">{e.title}</span>}
      </label>
      <label className="block text-xs text-mist">Description
        <textarea name="description" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={170} rows={3} placeholder={fallbackDescription} className="mt-1 w-full border border-basalt/25 bg-transparent p-3 text-sm text-basalt" />
        <span className={`mt-1 block text-xs ${tone(desc.length, 70, 160)}`}>{desc.length}/170 · aim for 70 to 160 characters.</span>
        {e.description && <span role="alert" className="block text-xs text-brass">{e.description}</span>}
      </label>
      <label className="block text-xs text-mist">Keywords (optional)<input name="keywords" defaultValue={d.keywords} className="field mt-1 text-sm text-basalt" /></label>
      <label className="block text-xs text-mist">Canonical address (optional)
        <input name="canonical" defaultValue={d.canonical} placeholder="Leave empty to use this page's own address" className="field mt-1 text-sm text-basalt" />
        {e.canonical && <span role="alert" className="block text-xs text-brass">{e.canonical}</span>}
      </label>
      <ImagePicker name="ogImageId" label="Share image (shown when the link is shared)" initial={og} />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="noIndex" defaultChecked={d.noIndex} className="mt-1" /><span>Hide this page from search engines<span className="block text-xs text-mist">It is also removed from the sitemap.</span></span></label>

      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.message && <p className="text-brass">{state.message}</p>}</div>
      <div className="flex items-center gap-6 border-t border-basalt/15 pt-6">
        <button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : "Save SEO"}</button>
        <Link href="/admin/seo" className="text-sm underline underline-offset-4">Cancel</Link>
      </div>
    </form>
  );
}
