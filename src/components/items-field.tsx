"use client";

import { useState } from "react";

export interface FieldDef { key: string; label: string; multiline?: boolean; placeholder?: string }

/** Daftar baris yang bisa ditambah, dihapus, dan diurutkan. Mengirim JSON lewat satu input tersembunyi. */
export function ItemsField({ name, initial, fields, max = 12, addLabel = "Add item", itemLabel = "Item" }: {
  name: string; initial: Record<string, string>[]; fields: FieldDef[]; max?: number; addLabel?: string; itemLabel?: string;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>(initial);
  const set = (i: number, k: string, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const move = (i: number, d: number) => setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <ol className="space-y-6">
        {rows.map((row, i) => (
          <li key={i} className="border-t border-basalt/20 pt-4">
            <div className="mb-3 flex items-center justify-between text-xs text-mist">
              <span>{itemLabel} {i + 1}</span>
              <span className="flex gap-4">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="underline underline-offset-4 disabled:no-underline disabled:opacity-30">Up</button>
                <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="underline underline-offset-4 disabled:no-underline disabled:opacity-30">Down</button>
                <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="underline underline-offset-4 hover:text-brass">Remove</button>
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <label key={f.key} className={`block text-xs text-mist ${f.multiline ? "sm:col-span-2" : ""}`}>{f.label}
                  {f.multiline
                    ? <textarea value={row[f.key] ?? ""} onChange={(e) => set(i, f.key, e.target.value)} rows={2} placeholder={f.placeholder} className="field mt-1 resize-none text-sm text-basalt" />
                    : <input value={row[f.key] ?? ""} onChange={(e) => set(i, f.key, e.target.value)} placeholder={f.placeholder} className="field mt-1 text-sm text-basalt" />}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {rows.length < max && (
        <button type="button" onClick={() => setRows((r) => [...r, Object.fromEntries(fields.map((f) => [f.key, ""]))])} className="btn-ghost mt-6 !py-2.5">{addLabel}</button>
      )}
    </div>
  );
}
