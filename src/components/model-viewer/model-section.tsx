"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Photo } from "@/components/photo";
import type { CardImage } from "@/types/property";
import type { ModelView } from "./types";

// Three.js dimuat hanya setelah pengunjung menekan tombol: tidak ada bobot 3D di halaman sampai itu.
const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <div className="flex h-[62vh] min-h-[380px] items-center justify-center bg-stone text-sm text-mist" role="status">Preparing the 3D viewer</div>,
});

const mb = (n: number) => `${(n / 1048576).toFixed(n > 10485760 ? 0 : 1)} MB`;

export function ModelSection({ models, poster }: { models: ModelView[]; poster: CardImage | null }) {
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [warn, setWarn] = useState("");
  const m = models[i];

  useEffect(() => {
    const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
    if (n.connection?.saveData || /(^|-)2g$/.test(n.connection?.effectiveType ?? "")) setWarn("Data saver is on. The model will use mobile data.");
    else if ((n.hardwareConcurrency ?? 8) <= 2 || (n.deviceMemory ?? 8) <= 2) setWarn("This device may show the 3D model slowly.");
  }, []);

  return (
    <div>
      {models.length > 1 && (
        <div role="tablist" aria-label="3D models" className="mb-4 flex gap-6 overflow-x-auto border-b border-basalt/15">
          {models.map((x, k) => (
            <button key={x.id} role="tab" aria-selected={k === i} onClick={() => setI(k)} className={`whitespace-nowrap pb-3 text-sm ${k === i ? "border-b-2 border-basalt" : "text-mist hover:text-basalt"}`}>{x.label}</button>
          ))}
        </div>
      )}
      {started ? (
        <Viewer key={m.id} url={m.url} label={m.label} lightPreset={m.lightPreset} camera={m.camera} />
      ) : (
        <div className="relative aspect-[16/10] overflow-hidden bg-stone">
          <div className="absolute inset-0 opacity-40"><Photo image={poster} sizes="(min-width:1024px) 60vw, 100vw" /></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/50 px-6 text-center">
            <button type="button" onClick={() => setStarted(true)} className="btn-primary">View in 3D</button>
            <p className="mt-4 text-sm">{m.label} · {mb(m.sizeBytes)}</p>
            {warn && <p className="mt-1 max-w-xs text-xs text-mist">{warn}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
