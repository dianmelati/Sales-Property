"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveSection, type CmsState } from "@/server/cms/actions";
import { ItemsField } from "@/components/items-field";
import { ImagePicker } from "@/components/image-picker";
import type { SectionType } from "@/lib/cms/types";

type C = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");

function F({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-mist">{label}
      <div className="mt-1 text-sm text-basalt">{children}</div>
      {hint && !error && <span className="mt-1 block text-xs">{hint}</span>}
      {error && <span id={`${name}-e`} role="alert" className="mt-1 block text-xs text-brass">{error}</span>}
    </label>
  );
}

export function SectionForm({ id, type, content, image }: { id: string; type: SectionType; content: C; image: { id: string; url: string } | null }) {
  const [state, action, pending] = useActionState<CmsState, FormData>(saveSection.bind(null, id), {});
  const e = state.errors ?? {};
  const t = (name: string, label: string, opts?: { area?: boolean; hint?: string; number?: boolean }) => (
    <F label={label} name={name} error={e[name]} hint={opts?.hint}>
      {opts?.area
        ? <textarea name={name} rows={3} defaultValue={s(content[name])} className="field resize-none" />
        : <input name={name} type={opts?.number ? "number" : "text"} min={opts?.number ? 1 : undefined} defaultValue={String(content[name] ?? "")} className="field" />}
    </F>
  );
  const items = Array.isArray(content.items) ? (content.items as Record<string, string>[]).map((i) => ({ title: s(i.title), text: s(i.text), href: s(i.href) })) : [];

  return (
    <form action={action} className="max-w-2xl space-y-8" noValidate>
      {type === "hero" && (<>
        {t("headline", "Headline")}{t("description", "Supporting text", { area: true })}
        <div className="grid gap-8 sm:grid-cols-2">{t("ctaLabel", "Button text (optional)")}{t("ctaHref", "Button link", { hint: "Start with / or https://" })}</div>
        <ImagePicker name="imageId" label="Hero image" initial={image} />
        {e.imageId && <p role="alert" className="text-xs text-brass">{e.imageId}</p>}
        <p className="text-xs text-mist">The property search below the hero is always shown.</p>
      </>)}
      {type === "properties" && (<>
        <F label="Which properties" name="variant">
          <select name="variant" defaultValue={s(content.variant) || "featured"} className="field">
            <option value="featured">Featured (marked Featured in a property)</option><option value="premium">Premium (marked Premium)</option><option value="latest">Latest published</option>
          </select>
        </F>
        {t("title", "Section title")}
        <div className="grid gap-8 sm:grid-cols-2">{t("linkLabel", "Link text")}{t("linkHref", "Link address")}</div>
        {t("count", "How many to show (1 to 9)", { number: true })}
        <p className="text-xs text-mist">The section is hidden automatically while no published property matches.</p>
      </>)}
      {(type === "locations" || type === "agents") && (<>{t("title", "Section title")}{t("intro", "Intro text", { area: true })}{t("count", type === "agents" ? "How many agents (1 to 12)" : "How many areas (1 to 12)", { number: true })}
        <p className="text-xs text-mist">{type === "agents" ? "Shows active agents marked Featured (set in Agents). Hidden automatically while there are none." : "Shows areas that have published properties, most listings first."}</p></>)}
      {(type === "why_us" || type === "services" || type === "insights") && (<>
        {t("title", "Section title")}{t("intro", "Intro text (optional)", { area: true })}
        <div>
          <ItemsField name="items" initial={items} addLabel="Add item" itemLabel="Item"
            fields={[{ key: "title", label: "Title" }, ...(type === "insights" ? [{ key: "href", label: "Link (optional)", placeholder: "/properties or https://" }] : []), { key: "text", label: "Text", multiline: true }]} />
          {e.items && <p role="alert" className="mt-3 text-xs text-brass">{e.items}</p>}
        </div>
      </>)}
      {(type === "testimonials" || type === "faq") && (<>
        {t("title", "Section title")}
        <p className="text-sm text-mist">The entries themselves are managed under <Link href={type === "faq" ? "/admin/cms/faqs" : "/admin/cms/testimonials"} className="underline underline-offset-4">{type === "faq" ? "FAQs" : "Testimonials"}</Link>. The section is hidden automatically while there are none visible.</p>
      </>)}
      {type === "cta" && (<>{t("title", "Headline")}<div className="grid gap-8 sm:grid-cols-2">{t("buttonLabel", "Button text")}{t("buttonHref", "Button link")}</div></>)}

      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.message && <p className={state.errors ? "text-brass" : "text-moss"}>{state.message}</p>}</div>
      <div className="flex items-center gap-6 border-t border-basalt/15 pt-6">
        <button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : "Save section"}</button>
        <Link href="/admin/cms/homepage" className="text-sm underline underline-offset-4">Back to sections</Link>
      </div>
    </form>
  );
}
