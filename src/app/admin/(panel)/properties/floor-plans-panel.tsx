"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveFloorPlan, removeFloorPlan, renameFloorPlan } from "@/server/floorplans/actions";

export interface PlanItem { id: string; label: string; kind: "image" | "pdf"; thumb: string | null; fileUrl: string | null; name: string }
const SUGGESTIONS = ["Ground Floor", "Second Floor", "Third Floor", "Roof Plan", "Basement", "Site Plan"];
const ACCEPT = "image/png,image/jpeg,image/svg+xml,application/pdf,.svg,.pdf";

function send(file: File, propertyId: string, label: string, floorPlanId: string | undefined, onProgress: (p: number) => void): Promise<string | null> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file); body.append("propertyId", propertyId); body.append("label", label);
    if (floorPlanId) body.append("floorPlanId", floorPlanId);
    xhr.open("POST", "/api/admin/floor-plans");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => resolve("Connection lost. Check your network and try again.");
    xhr.onload = () => { try { const r = JSON.parse(xhr.responseText); resolve(r.ok ? null : r.error?.message ?? "Upload failed."); } catch { resolve("Upload failed. Please try again."); } };
    xhr.send(body);
  });
}

export function FloorPlansPanel({ propertyId, plans }: { propertyId: string; plans: PlanItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState(plans.length === 0 ? "Ground Floor" : "");
  const [busy, setBusy] = useState<{ id: string; progress: number } | null>(null);
  const [error, setError] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  async function upload(file: File, lbl: string, planId?: string) {
    setError("");
    if (!lbl.trim()) { setError("Enter a label first, for example Ground Floor."); return; }
    setBusy({ id: planId ?? "new", progress: 0 });
    const err = await send(file, propertyId, lbl.trim(), planId, (progress) => setBusy({ id: planId ?? "new", progress }));
    setBusy(null);
    if (err) setError(err); else { if (!planId) setLabel(""); router.refresh(); }
  }
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); });
  const btn = "underline underline-offset-4 hover:text-brass disabled:no-underline disabled:opacity-30";

  return (
    <section aria-labelledby="plans" className="mt-20 max-w-3xl border-t border-basalt/15 pt-10">
      <h2 id="plans" className="text-3xl">Floor plans</h2>
      <p className="mt-2 text-sm text-mist">PNG, JPG, SVG or PDF. Add one plan per level. Changes here save immediately.</p>

      {plans.length === 0 ? (
        <div className="mt-8 border-y border-basalt/15 py-10"><p className="font-serif text-2xl">No floor plans yet</p><p className="mt-2 text-sm text-mist">Add the first plan below.</p></div>
      ) : (
        <ul className={`mt-8 divide-y divide-basalt/15 border-y border-basalt/15 ${pending ? "opacity-60" : ""}`}>
          {plans.map((p, i) => (
            <li key={p.id} className="grid gap-x-6 gap-y-3 py-5 sm:grid-cols-[120px_1fr]">
              <div className="flex aspect-[4/3] w-[120px] items-center justify-center overflow-hidden bg-stone text-xs text-mist">
                {p.thumb ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.thumb} alt={p.label} className="h-full w-full object-contain" /> : "PDF"}
              </div>
              <div className="min-w-0 space-y-3">
                <form action={renameFloorPlan.bind(null, propertyId, p.id)} className="flex flex-wrap items-end gap-3">
                  <label className="min-w-40 flex-1 text-xs text-mist">Label<input name="label" defaultValue={p.label} list="plan-labels" className="field !py-1.5 text-sm text-basalt" /></label>
                  <button className="text-sm underline underline-offset-4 hover:text-brass">Rename</button>
                </form>
                <p className="truncate text-xs text-mist">{p.name}{p.kind === "pdf" && p.fileUrl && <> · <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-brass">Open PDF</a></>}</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <button type="button" disabled={i === 0} onClick={() => run(() => moveFloorPlan(propertyId, p.id, "up"))} className={btn}>Up</button>
                  <button type="button" disabled={i === plans.length - 1} onClick={() => run(() => moveFloorPlan(propertyId, p.id, "down"))} className={btn}>Down</button>
                  <label className="cursor-pointer underline underline-offset-4 hover:text-brass">{busy?.id === p.id ? `Uploading ${busy.progress}%` : "Replace file"}
                    <input type="file" accept={ACCEPT} hidden disabled={!!busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, p.label, p.id); e.target.value = ""; }} />
                  </label>
                  <button type="button" onClick={() => { if (confirm(`Delete the floor plan "${p.label}"?`)) run(() => removeFloorPlan(propertyId, p.id)); }} className={btn}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <datalist id="plan-labels">{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="mt-8 flex flex-wrap items-end gap-4">
        <label className="min-w-48 flex-1 text-xs text-mist">Label for the new plan
          <input value={label} onChange={(e) => setLabel(e.target.value)} list="plan-labels" placeholder="Ground Floor" maxLength={60} className="field mt-1 text-sm text-basalt" />
        </label>
        <button type="button" disabled={!!busy} onClick={() => addRef.current?.click()} className="btn-primary !py-2.5 disabled:opacity-60">{busy?.id === "new" ? `Uploading ${busy.progress}%` : "Choose file"}</button>
        <input ref={addRef} type="file" accept={ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, label); e.target.value = ""; }} />
      </div>
      <p role="alert" className="mt-3 min-h-5 text-sm text-brass">{error}</p>
    </section>
  );
}
