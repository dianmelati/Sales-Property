"use client";

import { useState } from "react";

export interface PlanView { id: string; label: string; kind: "image" | "pdf"; src: string; srcSet: string; pdfUrl: string; alt: string }

/** Tab per lantai. Gambar bisa diperbesar (dapat digulir) agar teks kecil pada denah terbaca. PDF dibuka di tab baru. */
export function FloorPlanViewer({ plans }: { plans: PlanView[] }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const p = plans[i];
  return (
    <div>
      {plans.length > 1 && (
        <div role="tablist" aria-label="Floor plans" className="flex gap-6 overflow-x-auto border-b border-basalt/15">
          {plans.map((x, k) => (
            <button key={x.id} role="tab" id={`plan-tab-${x.id}`} aria-selected={k === i} aria-controls="plan-panel" onClick={() => { setI(k); setZoom(false); }}
              className={`whitespace-nowrap pb-3 text-sm ${k === i ? "border-b-2 border-basalt" : "text-mist hover:text-basalt"}`}>{x.label}</button>
          ))}
        </div>
      )}
      <div id="plan-panel" role="tabpanel" aria-labelledby={`plan-tab-${p.id}`} className="mt-6">
        {p.kind === "pdf" ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border border-basalt/20 p-8">
            <div><p className="font-serif text-2xl">{p.label}</p><p className="mt-1 text-sm text-mist">This floor plan is a PDF document.</p></div>
            <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">Open floor plan (PDF)</a>
          </div>
        ) : (
          <>
            <div className={`border border-basalt/15 bg-white ${zoom ? "max-h-[80vh] overflow-auto" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} srcSet={zoom ? undefined : p.srcSet} sizes="(min-width:1024px) 60vw, 100vw" alt={p.alt} loading="lazy" decoding="async"
                className={zoom ? "h-auto w-[200%] max-w-none" : "mx-auto max-h-[70vh] w-full object-contain"} />
            </div>
            <button type="button" onClick={() => setZoom(!zoom)} aria-pressed={zoom} className="mt-3 text-sm underline underline-offset-4 hover:text-brass">{zoom ? "Fit to screen" : "Zoom in"}</button>
          </>
        )}
      </div>
    </div>
  );
}
