"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SortSelect({ value, options }: { value: string; options: [string, string][] }) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="text-mist">Sort by</span>
      <select value={value} className="field !w-auto !py-1.5"
        onChange={(e) => { const p = new URLSearchParams(sp.toString()); p.set("sort", e.target.value); p.delete("page"); router.push(`/properties?${p}`); }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/** Di layar kecil filter disembunyikan di balik tombol; di desktop selalu tampil. */
export function FiltersToggle({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="filters" className="btn-ghost w-full lg:hidden">
        {open ? "Hide filters" : `Filters${activeCount ? ` (${activeCount})` : ""}`}
      </button>
      <div id="filters" className={`${open ? "mt-6 block" : "hidden"} lg:mt-0 lg:block`}>{children}</div>
    </div>
  );
}
