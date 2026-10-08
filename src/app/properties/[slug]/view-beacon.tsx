"use client";

import { useEffect } from "react";

/** Mengirim satu hitungan tampilan per sesi browser, sebentar setelah halaman dimuat. */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* sessionStorage diblokir: tetap kirim */ }
    const t = setTimeout(() => {
      const body = new Blob([JSON.stringify({ slug })], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/properties/view", body)) fetch("/api/properties/view", { method: "POST", body, keepalive: true }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [slug]);
  return null;
}
