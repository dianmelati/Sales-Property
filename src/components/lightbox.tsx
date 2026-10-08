"use client";

import { useEffect, useRef, useState } from "react";
import type { CardImage } from "@/types/property";

const EVENT = "estate:lightbox";

/** Tombol di mana saja pada halaman yang membuka lightbox pada foto ke-`index`. */
export function GalleryButton({ index, label, className, children }: { index: number; label: string; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} className={className} onClick={() => window.dispatchEvent(new CustomEvent(EVENT, { detail: { index } }))}>
      {children}
    </button>
  );
}

export function Lightbox({ images }: { images: CardImage[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const n = images.length;

  useEffect(() => {
    const open = (e: Event) => { setI((e as CustomEvent<{ index: number }>).detail.index); ref.current?.showModal(); };
    window.addEventListener(EVENT, open);
    return () => window.removeEventListener(EVENT, open);
  }, []);

  useEffect(() => {
    // Muat foto tetangga lebih awal agar pindah foto terasa instan.
    [i + 1, i - 1].forEach((k) => { const im = images[(k + n) % n]; if (im) new Image().src = im.src; });
  }, [i, images, n]);

  const go = (d: number) => setI((x) => (x + d + n) % n);
  const cur = images[i];

  return (
    <dialog
      ref={ref} aria-label="Photo viewer"
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current != null) { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); touch.current = null; } }}
      className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none flex-col bg-basalt p-0 text-paper open:flex backdrop:bg-basalt"
    >
      <div className="flex items-center justify-between px-5 py-4 text-sm">
        <p aria-live="polite">{i + 1} of {n}</p>
        <button type="button" onClick={() => ref.current?.close()} className="underline underline-offset-4">Close</button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        {cur && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={cur.src} src={cur.src} srcSet={cur.srcSet} sizes="100vw" alt={cur.alt} className="max-h-full max-w-full object-contain" />
        )}
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-6 text-2xl hover:text-brass sm:px-6">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-0 top-1/2 -translate-y-1/2 px-4 py-6 text-2xl hover:text-brass sm:px-6">›</button>
          </>
        )}
      </div>
      <p className="px-5 py-4 text-center text-sm text-paper/70">{cur?.alt}</p>
    </dialog>
  );
}
