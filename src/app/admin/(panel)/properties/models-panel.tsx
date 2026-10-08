"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { makeDefaultModel, removeModel, renameModel, saveCamera, setLightPreset } from "@/server/models/actions";
import { LIGHT_PRESETS, PRESET_LABEL, type CameraConfig, type LightPreset, type ViewerApi } from "@/components/model-viewer/types";

const Viewer = dynamic(() => import("@/components/model-viewer/viewer"), { ssr: false, loading: () => <p className="p-10 text-sm text-mist">Preparing the viewer</p> });

export interface ModelItem { id: string; label: string; url: string; name: string; sizeBytes: number; lightPreset: LightPreset; camera: CameraConfig | null; isDefault: boolean }
const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;

function send(file: File, propertyId: string, label: string, modelId: string | undefined, onProgress: (p: number) => void): Promise<string | null> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file); body.append("propertyId", propertyId); body.append("label", label);
    if (modelId) body.append("modelId", modelId);
    xhr.open("POST", "/api/admin/models");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => resolve("Connection lost. Check your network and try again.");
    xhr.onload = () => { try { const r = JSON.parse(xhr.responseText); resolve(r.ok ? null : r.error?.message ?? "Upload failed."); } catch { resolve("Upload failed. The file may be too large for the server."); } };
    xhr.send(body);
  });
}

export function ModelsPanel({ propertyId, models }: { propertyId: string; models: ModelItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState(models.length === 0 ? "Exterior" : "");
  const [busy, setBusy] = useState<{ id: string; progress: number } | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ModelItem | null>(null);
  const [note, setNote] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const viewRef = useRef<ViewerApi | null>(null);

  async function upload(file: File, lbl: string, id?: string) {
    setError("");
    if (!lbl.trim()) { setError("Enter a label first, for example Exterior."); return; }
    setBusy({ id: id ?? "new", progress: 0 });
    const err = await send(file, propertyId, lbl.trim(), id, (progress) => setBusy({ id: id ?? "new", progress }));
    setBusy(null);
    if (err) setError(err); else { if (!id) setLabel(""); router.refresh(); }
  }
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); });
  const btn = "underline underline-offset-4 hover:text-brass disabled:no-underline disabled:opacity-30";
  const openPreview = (m: ModelItem) => { setPreview(m); setNote(""); dialog.current?.showModal(); };

  return (
    <section aria-labelledby="models" className="mt-20 max-w-3xl border-t border-basalt/15 pt-10">
      <h2 id="models" className="text-3xl">3D models</h2>
      <p className="mt-2 text-sm text-mist">GLB exported from Blender (or a self-contained glTF), up to 50 MB. Visitors open the model with a View in 3D button, so it never slows the page.</p>

      {models.length === 0 ? (
        <div className="mt-8 border-y border-basalt/15 py-10"><p className="font-serif text-2xl">No 3D model yet</p><p className="mt-2 text-sm text-mist">Upload the .glb below.</p></div>
      ) : (
        <ul className={`mt-8 divide-y divide-basalt/15 border-y border-basalt/15 ${pending ? "opacity-60" : ""}`}>
          {models.map((m) => (
            <li key={m.id} className="space-y-3 py-5">
              <form action={renameModel.bind(null, propertyId, m.id)} className="flex flex-wrap items-end gap-3">
                <label className="min-w-40 flex-1 text-xs text-mist">Label<input name="label" defaultValue={m.label} className="field !py-1.5 text-sm text-basalt" /></label>
                <button className="text-sm underline underline-offset-4 hover:text-brass">Rename</button>
              </form>
              <p className="truncate text-xs text-mist">{m.name} · {mb(m.sizeBytes)}{m.isDefault && " · Shown first"}{m.camera ? " · Custom camera" : " · Automatic camera"}</p>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3 text-sm">
                <label className="text-xs text-mist">Lighting
                  <select value={m.lightPreset} onChange={(e) => run(() => setLightPreset(propertyId, m.id, e.target.value))} className="field !w-auto !py-1.5 text-sm text-basalt">
                    {LIGHT_PRESETS.map((p) => <option key={p} value={p}>{PRESET_LABEL[p]}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => openPreview(m)} className={btn}>Preview and set camera</button>
                {!m.isDefault && <button type="button" onClick={() => run(() => makeDefaultModel(propertyId, m.id))} className={btn}>Show first</button>}
                <label className="cursor-pointer underline underline-offset-4 hover:text-brass">{busy?.id === m.id ? `Uploading ${busy.progress}%` : "Replace file"}
                  <input type="file" accept=".glb,.gltf,model/gltf-binary" hidden disabled={!!busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, m.label, m.id); e.target.value = ""; }} />
                </label>
                <button type="button" onClick={() => { if (confirm(`Delete the 3D model "${m.label}"?`)) run(() => removeModel(propertyId, m.id)); }} className={btn}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <label className="min-w-48 flex-1 text-xs text-mist">Label for the new model
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Exterior" maxLength={60} className="field mt-1 text-sm text-basalt" />
        </label>
        <button type="button" disabled={!!busy} onClick={() => addRef.current?.click()} className="btn-primary !py-2.5 disabled:opacity-60">{busy?.id === "new" ? `Uploading ${busy.progress}%` : "Choose .glb file"}</button>
        <input ref={addRef} type="file" accept=".glb,.gltf,model/gltf-binary" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, label); e.target.value = ""; }} />
      </div>
      <p role="alert" className="mt-3 min-h-5 text-sm text-brass">{error}</p>

      <dialog ref={dialog} onClose={() => setPreview(null)} aria-label="Preview 3D model" className="m-auto w-[min(1000px,94vw)] max-h-[94vh] overflow-y-auto bg-paper p-5 text-basalt backdrop:bg-basalt/60 lg:p-8">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-2xl">{preview?.label}</h3><button type="button" onClick={() => dialog.current?.close()} className="text-sm underline underline-offset-4">Close</button></div>
        {preview && <Viewer key={preview.id + preview.url} url={preview.url} label={preview.label} lightPreset={preview.lightPreset} camera={preview.camera} viewRef={viewRef} className="h-[55vh] min-h-[320px]" />}
        {preview && (
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <button type="button" className="btn-primary !py-2.5" onClick={async () => {
              const v = viewRef.current?.getView();
              if (!v) { setNote("The model is still loading."); return; }
              const r = await saveCamera(propertyId, preview.id, v); setNote(r.message); if (r.ok) router.refresh();
            }}>Use this view as the starting camera</button>
            <button type="button" className={btn} onClick={async () => { const r = await saveCamera(propertyId, preview.id, null); setNote(r.message); if (r.ok) { viewRef.current?.reset(); router.refresh(); } }}>Back to automatic framing</button>
          </div>
        )}
        <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-moss">{note}</p>
      </dialog>
    </section>
  );
}
