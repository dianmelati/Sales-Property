"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/photo";
import { clearCompare, toggleCompare, useCompare } from "@/hooks/use-compare";
import { formatPrice } from "@/lib/format";
import type { CompareRow } from "@/types/property";

const yn = (b: boolean) => (b ? "Yes" : "No");
const num = (n: number | null, unit = "") => (n == null || n === 0 ? "Not stated" : `${n}${unit}`);
const ROWS: { label: string; get: (p: CompareRow) => string }[] = [
  { label: "Price", get: (p) => formatPrice(p.price, p.currency) },
  { label: "Buy or rent", get: (p) => (p.transaction === "RENT" ? "For rent" : "For sale") },
  { label: "Type", get: (p) => p.category },
  { label: "Location", get: (p) => p.location },
  { label: "Bedrooms", get: (p) => (p.bedrooms == null ? "Not stated" : String(p.bedrooms)) },
  { label: "Bathrooms", get: (p) => (p.bathrooms == null ? "Not stated" : String(p.bathrooms)) },
  { label: "Land area", get: (p) => num(p.landArea, " m²") },
  { label: "Building area", get: (p) => num(p.buildingArea, " m²") },
  { label: "Floors", get: (p) => num(p.floors) },
  { label: "Parking spaces", get: (p) => (p.parking == null ? "Not stated" : String(p.parking)) },
  { label: "Certificate", get: (p) => p.certificate ?? "Not stated" },
  { label: "Furnished", get: (p) => yn(p.furnished) },
  { label: "Swimming pool", get: (p) => yn(p.hasPool) },
  { label: "Garage", get: (p) => yn(p.hasGarage) },
  { label: "Garden", get: (p) => yn(p.hasGarden) },
];

export function CompareTable() {
  const slugs = useCompare();
  const [rows, setRows] = useState<CompareRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [diffOnly, setDiffOnly] = useState(false);
  const key = slugs.join(",");

  useEffect(() => {
    if (!key) { setRows([]); return; }
    let live = true; setFailed(false);
    fetch(`/api/properties/compare?slugs=${encodeURIComponent(key)}`).then((r) => r.json())
      .then((r) => { if (live) r.ok ? setRows(r.data) : setFailed(true); }).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [key]);

  if (failed) return <p className="mt-10 text-sm">The comparison could not load. Refresh the page to try again.</p>;
  if (rows === null) return <p className="mt-10 text-sm text-mist" aria-busy="true">Loading</p>;
  const shown = rows.filter((r) => slugs.includes(r.slug));
  if (shown.length === 0) {
    return (
      <div className="mt-10 border-y border-basalt/15 py-16">
        <p className="font-serif text-3xl">Nothing to compare yet</p>
        <p className="mt-3 max-w-md text-sm text-mist">Choose Compare on up to 3 properties and they will appear side by side here.</p>
        <Link href="/properties" className="btn-primary mt-8">Browse properties</Link>
      </div>
    );
  }
  const lines = ROWS.map((r) => ({ ...r, values: shown.map(r.get) })).map((r) => ({ ...r, differs: new Set(r.values).size > 1 }));
  const visible = diffOnly && shown.length > 1 ? lines.filter((l) => l.differs) : lines;
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm">
        {shown.length > 1 ? <label className="flex items-center gap-2"><input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} /> Show only differences</label> : <span className="text-mist">Add one more property to compare.</span>}
        <button type="button" onClick={clearCompare} className="underline underline-offset-4 hover:text-brass">Clear all</button>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <caption className="sr-only">Property comparison</caption>
          <thead>
            <tr>
              <td className="sticky left-0 w-32 bg-paper" />
              {shown.map((p) => (
                <th key={p.id} scope="col" className="min-w-52 border-b border-basalt/15 p-3 pb-5 align-top font-normal">
                  <div className="aspect-[4/3] overflow-hidden bg-stone"><Photo image={p.image} sizes="(min-width:1024px) 28vw, 70vw" /></div>
                  <Link href={`/properties/${p.slug}`} className="mt-3 block font-serif text-xl leading-snug hover:text-moss">{p.title}</Link>
                  <button type="button" onClick={() => toggleCompare(p.slug)} className="mt-1 text-xs text-mist underline underline-offset-4 hover:text-brass">Remove</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => (
              <tr key={l.label} className="border-b border-basalt/10">
                <th scope="row" className="sticky left-0 bg-paper py-3 pr-4 text-xs font-normal text-mist">{l.label}</th>
                {l.values.map((v, i) => <td key={i} className={`p-3 ${l.differs ? "font-medium" : ""} ${l.label === "Price" ? "text-brass" : ""}`}>{v}</td>)}
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={shown.length + 1} className="py-8 text-mist">These properties have identical details.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
