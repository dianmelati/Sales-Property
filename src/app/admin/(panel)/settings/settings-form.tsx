"use client";

import { useActionState } from "react";
import { saveSettings, type CmsState } from "@/server/cms/actions";
import { ItemsField } from "@/components/items-field";
import type { SiteSettings } from "@/server/cms/settings";

export function SettingsForm({ s }: { s: SiteSettings }) {
  const [state, action, pending] = useActionState<CmsState, FormData>(saveSettings, {});
  const e = state.errors ?? {};
  const f = (name: string, label: string, value: string, hint?: string, type = "text") => (
    <label className="block text-xs text-mist">{label}
      <input name={name} type={type} defaultValue={value} className="field mt-1 text-sm text-basalt" aria-invalid={!!e[name]} />
      {hint && !e[name] && <span className="mt-1 block text-xs">{hint}</span>}
      {e[name] && <span role="alert" className="mt-1 block text-xs text-brass">{e[name]}</span>}
    </label>
  );
  return (
    <form action={action} className="max-w-2xl space-y-14" noValidate>
      <section className="space-y-8" aria-labelledby="wa">
        <h2 id="wa" className="text-2xl">WhatsApp</h2>
        {f("whatsapp", "WhatsApp number", s.whatsappRaw, "Local format works (0812...). It is converted to international format for the chat link. Leave empty to hide all WhatsApp buttons.", "tel")}
        {s.whatsapp && <p className="text-xs text-mist">Chat links currently use +{s.whatsapp}</p>}
      </section>
      <section className="space-y-8" aria-labelledby="ct">
        <h2 id="ct" className="text-2xl">Contact information</h2>
        <div className="grid gap-8 sm:grid-cols-2">{f("email", "Email", s.contact.email, undefined, "email")}{f("phone", "Phone", s.contact.phone, undefined, "tel")}</div>
        {f("address", "Office address", s.contact.address)}{f("hours", "Opening hours", s.contact.hours, "For example: Monday to Saturday, 9:00 to 17:00")}
      </section>
      <section className="space-y-8" aria-labelledby="so">
        <h2 id="so" className="text-2xl">Social media</h2>
        <div className="grid gap-8 sm:grid-cols-2">
          {f("instagram", "Instagram link", s.social.instagram, "https://...")}{f("facebook", "Facebook link", s.social.facebook)}
          {f("youtube", "YouTube link", s.social.youtube)}{f("tiktok", "TikTok link", s.social.tiktok)}
        </div>
      </section>
      <section className="space-y-8" aria-labelledby="nv">
        <h2 id="nv" className="text-2xl">Navigation menu</h2>
        <p className="text-sm text-mist">Shown in the header and footer, in this order. Up to 8 items.</p>
        <ItemsField name="nav" initial={s.nav.map((n) => ({ label: n.label, href: n.href }))} max={8} addLabel="Add menu item" itemLabel="Menu item"
          fields={[{ key: "label", label: "Label" }, { key: "href", label: "Link", placeholder: "/properties" }]} />
        {e.nav && <p role="alert" className="text-xs text-brass">{e.nav}</p>}
      </section>
      <section className="space-y-8" aria-labelledby="ft">
        <h2 id="ft" className="text-2xl">Footer</h2>
        {f("footerText", "Footer text", s.footerText, "A short line about your company")}
      </section>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.message && <p className={state.errors ? "text-brass" : "text-moss"}>{state.message}</p>}</div>
      <div className="border-t border-basalt/15 pt-6"><button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : "Save settings"}</button></div>
    </form>
  );
}
