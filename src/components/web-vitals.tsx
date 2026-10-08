"use client";

import { useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";

/** Mengirim sampel 25% pengunjung. CLS dikali 1000 agar tetap bilangan yang mudah dibaca di log. */
export function WebVitals() {
  const sampled = useRef(Math.random() < 0.25);
  useReportWebVitals((m) => {
    if (!sampled.current || location.pathname.startsWith("/admin")) return;
    const path = location.pathname.replace(/^\/(properties|locations|agents)\/[^/]+$/, "/$1/[slug]");
    const body = JSON.stringify({ name: m.name, value: Math.round(m.name === "CLS" ? m.value * 1000 : m.value), rating: m.rating, path, device: matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop" });
    navigator.sendBeacon?.("/api/vitals", new Blob([body], { type: "application/json" }));
  });
  return null;
}
