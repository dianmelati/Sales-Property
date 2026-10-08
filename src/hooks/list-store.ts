"use client";

import { useSyncExternalStore } from "react";

/** Daftar slug di localStorage yang sinkron antar komponen dan antar tab. */
export function createListStore(key: string, max: number) {
  const EMPTY: string[] = [];
  const listeners = new Set<() => void>();
  let cache: string[] | null = null;

  const read = (): string[] => {
    try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max) : []; } catch { return []; }
  };
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => { if (e.key === key) { cache = null; cb(); } };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
  };
  const snapshot = () => (cache ??= read());
  const commit = (next: string[]) => {
    cache = next;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* penyimpanan penuh atau diblokir: tetap di memori */ }
    listeners.forEach((l) => l());
  };

  return {
    /** Mengembalikan false bila penuh. */
    toggle(slug: string): boolean {
      const cur = snapshot();
      if (cur.includes(slug)) { commit(cur.filter((s) => s !== slug)); return true; }
      if (cur.length >= max) return false;
      commit([...cur, slug]); return true;
    },
    clear: () => commit([]),
    useList: () => useSyncExternalStore(subscribe, snapshot, () => EMPTY),
    max,
  };
}
