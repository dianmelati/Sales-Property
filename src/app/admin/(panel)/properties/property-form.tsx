"use client";

import { useActionState, useRef, useState } from "react";
import { saveProperty, type PropertyFormState } from "@/server/properties/actions";
import { RichTextEditor } from "@/components/rich-text-editor";

type Opt = { id: string; name: string };
export type PropertyDefaults = Partial<Record<string, string | number | boolean | null>> & { features?: string };

// Langkah media (gambar, denah, video, 3D) ditambahkan di fase 4, 9, 10.
const STEPS = ["Basics", "Location", "Specifications", "Description", "SEO", "Preview and publish"] as const;
const fieldsByStep: string[][] = [
  ["title", "slug", "categoryId", "transaction", "price", "currency", "agentId"],
  ["locationId", "address", "latitude", "longitude"],
  ["landArea", "buildingArea", "bedrooms", "bathrooms", "floors", "parking", "certificate"],
  ["description", "featuresText"],
  ["seoTitle", "seoDescription", "seoKeywords"],
  ["status"],
];

function Field({ label, name, error, children, hint }: { label: string; name: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-mist">
      {label}
      <div className="mt-1 text-sm text-basalt">{children}</div>
      {hint && !error && <span className="mt-1 block text-xs">{hint}</span>}
      {error && <span id={`${name}-err`} role="alert" className="mt-1 block text-xs text-brass">{error}</span>}
    </label>
  );
}

export function PropertyForm({ id, defaults = {}, options, created }: {
  id: string | null; defaults?: PropertyDefaults; options: { categories: Opt[]; locations: Opt[]; agents: Opt[] }; created?: boolean;
}) {
  const [state, action, pending] = useActionState<PropertyFormState, FormData>(saveProperty.bind(null, id), {});
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState<[string, string][]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const d = (k: string) => (defaults[k] ?? "") as string | number;
  const err = state.errors ?? {};
  const errSteps = STEPS.map((_, i) => fieldsByStep[i].some((f) => err[f]));

  function go(n: number) {
    if (n === STEPS.length - 1 && formRef.current) {
      const f = new FormData(formRef.current);
      const name = (sel: string, k: string) => options[sel as "categories" | "locations"].find((o) => o.id === f.get(k))?.name ?? "Not set";
      setSummary([
        ["Title", String(f.get("title") || "Not set")],
        ["Type", name("categories", "categoryId")],
        ["Transaction", f.get("transaction") === "RENT" ? "For rent" : "For sale"],
        ["Price", `${f.get("currency")} ${Number(f.get("price") || 0).toLocaleString("en")}`],
        ["Location", name("locations", "locationId")],
        ["Bedrooms / bathrooms", `${f.get("bedrooms") || "-"} / ${f.get("bathrooms") || "-"}`],
        ["Land / building", `${f.get("landArea") || "-"} / ${f.get("buildingArea") || "-"} m²`],
      ]);
    }
    setStep(n);
  }

  const input = "field";
  return (
    <form ref={formRef} action={action} className="max-w-3xl" noValidate>
      {created && <p className="mb-6 border-l-2 border-moss pl-3 text-sm">Property created as a draft. Continue editing or publish when ready.</p>}

      <ol className="mb-10 flex gap-x-6 gap-y-2 overflow-x-auto border-b border-basalt/15 pb-3 text-sm">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined}
              className={`whitespace-nowrap pb-1 ${i === step ? "border-b-2 border-basalt" : "text-mist hover:text-basalt"}`}>
              {s}{errSteps[i] && <span className="ml-1 text-brass" aria-label="has errors">•</span>}
            </button>
          </li>
        ))}
      </ol>

      {/* Semua langkah tetap ada di DOM (hidden) agar satu <form> mengirim semua nilai. */}
      <section hidden={step !== 0} className="grid gap-8 md:grid-cols-2">
        <div className="md:col-span-2"><Field label="Title" name="title" error={err.title}><input name="title" defaultValue={d("title")} required className={input} /></Field></div>
        <Field label="Web address (slug)" name="slug" error={err.slug} hint="Leave empty to generate from the title"><input name="slug" defaultValue={d("slug")} className={input} /></Field>
        <Field label="Property type" name="categoryId" error={err.categoryId}>
          <select name="categoryId" defaultValue={d("categoryId")} className={input}><option value="">Choose</option>{options.categories.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        </Field>
        <Field label="Transaction" name="transaction"><select name="transaction" defaultValue={d("transaction") || "SALE"} className={input}><option value="SALE">For sale</option><option value="RENT">For rent</option></select></Field>
        <div className="grid grid-cols-[110px_1fr] gap-4">
          <Field label="Currency" name="currency"><select name="currency" defaultValue={d("currency") || "IDR"} className={input}>{["IDR", "USD", "SGD", "EUR"].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Price" name="price" error={err.price}><input name="price" type="number" min="0" step="any" inputMode="decimal" defaultValue={d("price")} className={input} /></Field>
        </div>
        <Field label="Agent" name="agentId"><select name="agentId" defaultValue={d("agentId")} className={input}><option value="">Unassigned</option>{options.agents.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <div className="flex flex-wrap gap-x-8 gap-y-3 self-end text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={!!defaults.isFeatured} /> Featured</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="isPremium" defaultChecked={!!defaults.isPremium} /> Premium</label>
        </div>
      </section>

      <section hidden={step !== 1} className="grid gap-8 md:grid-cols-2">
        <Field label="Area" name="locationId" error={err.locationId}>
          <select name="locationId" defaultValue={d("locationId")} className={input}><option value="">Choose</option>{options.locations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        </Field>
        <div className="md:col-span-2"><Field label="Street address" name="address" error={err.address}><input name="address" defaultValue={d("address")} className={input} /></Field></div>
        <Field label="Latitude" name="latitude" error={err.latitude}><input name="latitude" type="number" step="any" defaultValue={d("latitude")} className={input} /></Field>
        <Field label="Longitude" name="longitude" error={err.longitude}><input name="longitude" type="number" step="any" defaultValue={d("longitude")} className={input} /></Field>
      </section>

      <section hidden={step !== 2} className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
        {([["landArea", "Land area (m²)"], ["buildingArea", "Building area (m²)"], ["bedrooms", "Bedrooms"], ["bathrooms", "Bathrooms"], ["floors", "Floors"], ["parking", "Parking spaces"]] as const).map(([n, l]) => (
          <Field key={n} label={l} name={n} error={err[n]}><input name={n} type="number" min="0" inputMode="numeric" defaultValue={d(n)} className={input} /></Field>
        ))}
        <Field label="Certificate" name="certificate">
          <select name="certificate" defaultValue={d("certificate")} className={input}><option value="">Not stated</option>{["SHM", "HGB", "HPL", "STRATA", "OTHER"].map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm sm:col-span-2 md:col-span-3">
          {([["furnished", "Furnished"], ["hasPool", "Swimming pool"], ["hasGarage", "Garage"], ["hasGarden", "Garden"]] as const).map(([n, l]) => (
            <label key={n} className="flex items-center gap-2"><input type="checkbox" name={n} defaultChecked={!!defaults[n]} /> {l}</label>
          ))}
        </div>
      </section>

      <section hidden={step !== 3} className="space-y-8">
        <div><p className="mb-2 text-xs text-mist">Description</p><RichTextEditor name="description" initial={String(defaults.description ?? "")} /></div>
        <Field label="Features" name="featuresText" hint="One feature per line"><textarea name="featuresText" rows={6} defaultValue={defaults.features ?? ""} className="w-full border border-basalt/25 bg-transparent p-3 text-sm" /></Field>
      </section>

      <section hidden={step !== 4} className="space-y-8">
        <Field label="SEO title" name="seoTitle" error={err.seoTitle} hint="Up to 70 characters. Empty uses the property title."><input name="seoTitle" maxLength={70} defaultValue={d("seoTitle")} className={input} /></Field>
        <Field label="SEO description" name="seoDescription" error={err.seoDescription} hint="Up to 170 characters"><textarea name="seoDescription" maxLength={170} rows={3} defaultValue={d("seoDescription")} className="w-full border border-basalt/25 bg-transparent p-3 text-sm" /></Field>
        <Field label="Keywords" name="seoKeywords" hint="Separated by commas"><input name="seoKeywords" defaultValue={d("seoKeywords")} className={input} /></Field>
      </section>

      <section hidden={step !== 5} className="space-y-8">
        <dl className="divide-y divide-basalt/15 border-y border-basalt/15 text-sm">
          {summary.map(([k, v]) => <div key={k} className="grid grid-cols-[170px_1fr] gap-4 py-3"><dt className="text-mist">{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <Field label="Status" name="status">
          <select name="status" defaultValue={d("status") || "DRAFT"} className={input}>
            {[["DRAFT", "Draft"], ["PUBLISHED", "Published"], ["RESERVED", "Reserved"], ["SOLD", "Sold"], ["RENTED", "Rented"], ["ARCHIVED", "Archived"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <p className="text-sm text-mist">Photos, floor plans, video and 3D model are added in later phases and will appear as extra steps here.</p>
      </section>

      <div role="status" aria-live="polite" className="mt-10 min-h-6 text-sm">
        {state.message && <p className={state.errors ? "text-brass" : "text-moss"}>{state.message}</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-basalt/15 pt-6">
        {step > 0 && <button type="button" onClick={() => go(step - 1)} className="btn-ghost">Back</button>}
        {step < STEPS.length - 1 && <button type="button" onClick={() => go(step + 1)} className="btn-ghost">Next</button>}
        <span className="flex-1" />
        <button type="submit" name="intent" value="save" disabled={pending} className="btn-ghost disabled:opacity-60">{pending ? "Saving" : "Save"}</button>
        <button type="submit" name="intent" value="publish" disabled={pending} className="btn-brass disabled:opacity-60">Publish</button>
      </div>
    </form>
  );
}
