"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MediaItem {
  id: string; name: string; alt: string | null; mimeType: string; sizeBytes: number; width: number | null; height: number | null;
  isWebp: boolean; createdAt: string; urls: { thumbnail: string; small: string; medium: string; large: string };
}
interface UploadJob { key: string; name: string; progress: number; error?: string; done?: boolean }

const ACCEPT = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif";
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

function uploadOne(file: File, onProgress: (p: number) => void): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);
    xhr.open("POST", "/api/admin/media");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => resolve({ ok: false, error: "Connection lost. Check your network and try again." });
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        resolve(res.ok ? { ok: true } : { ok: false, error: res.error?.message ?? "Upload failed." });
      } catch {
        resolve({ ok: false, error: "Upload failed. Please try again." });
      }
    };
    xhr.send(body);
  });
}

export function MediaBrowser({ mode, onPick, pickLabel = "Use selected", single = false }: { mode: "manage" | "pick"; onPick?: (ids: string[], items: MediaItem[]) => void; pickLabel?: string; single?: boolean }) {
  const seen = useRef(new Map<string, MediaItem>());
  const [items, setItems] = useState<MediaItem[]>([]);
  const [q, setQ] = useState("");
  const [usage, setUsage] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [drag, setDrag] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try {
      const p = new URLSearchParams({ page: String(page) });
      if (q) p.set("q", q);
      if (usage) p.set("usage", usage);
      const res = await (await fetch(`/api/admin/media?${p}`)).json();
      if (!res.ok) throw new Error();
      setItems(res.data.items); setPages(res.data.pages); setTotal(res.data.total);
      for (const it of res.data.items as MediaItem[]) seen.current.set(it.id, it);
    } catch { setLoadError(true); }
    setLoading(false);
  }, [page, q, usage]);

  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    const entries = list.map((f, i) => ({ f, key: `${Date.now()}-${i}-${f.name}` }));
    setJobs((j) => [...entries.map((e) => ({ key: e.key, name: e.f.name, progress: 0 })), ...j]);
    const queue = [...entries];
    const worker = async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        const r = await uploadOne(e.f, (p) => setJobs((j) => j.map((x) => (x.key === e.key ? { ...x, progress: p } : x))));
        setJobs((j) => j.map((x) => (x.key === e.key ? { ...x, progress: 100, done: r.ok, error: r.error } : x)));
      }
    };
    await Promise.all([worker(), worker()]); // 2 unggahan paralel
    setPage(1); load();
    setTimeout(() => setJobs((j) => j.filter((x) => x.error)), 4000);
  }

  const current = mode === "manage" && selected.length === 1 ? items.find((i) => i.id === selected[0]) : undefined;
  const toggle = (id: string) => setSelected((s) => (mode === "pick" && !single ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : s[0] === id ? [] : [id]));

  async function save(item: MediaItem, name: string, alt: string) {
    const res = await (await fetch(`/api/admin/media/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, alt }) })).json();
    if (res.ok) { setItems((l) => l.map((x) => (x.id === item.id ? res.data : x))); setNotice("Saved."); } else setNotice(res.error.message);
  }
  async function remove(item: MediaItem) {
    if (!confirm(`Delete "${item.name}" permanently?`)) return;
    const res = await (await fetch(`/api/admin/media/${item.id}`, { method: "DELETE" })).json();
    if (res.ok) { setSelected([]); setNotice("Deleted."); load(); } else setNotice(res.error.message);
  }
  async function copy(url: string) {
    await navigator.clipboard.writeText(new URL(url, location.origin).href);
    setNotice("URL copied.");
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
        className={`border border-dashed p-8 text-center transition-colors ${drag ? "border-brass bg-brass/5" : "border-basalt/30"}`}
      >
        <p className="text-sm">Drag photos here, or <button type="button" onClick={() => inputRef.current?.click()} className="underline underline-offset-4 hover:text-brass">choose files</button></p>
        <p className="mt-1 text-xs text-mist">JPG, PNG or HEIC, up to 25 MB each. They are converted to WebP automatically.</p>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }} />
      </div>

      {jobs.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm" aria-live="polite">
          {jobs.map((j) => (
            <li key={j.key}>
              <div className="flex justify-between gap-4"><span className="truncate">{j.name}</span><span className={j.error ? "text-brass" : "text-mist"}>{j.error ?? (j.done ? "Done" : j.progress === 100 ? "Processing" : `${j.progress}%`)}</span></div>
              {!j.error && <div className="mt-1 h-px bg-basalt/15"><div className="h-px bg-basalt transition-all" style={{ width: `${j.progress}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-end gap-6">
        <label className="min-w-[200px] flex-1 text-xs text-mist">Search by name<input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="field !py-2 text-sm text-basalt" /></label>
        <label className="text-xs text-mist">Show
          <select value={usage} onChange={(e) => { setUsage(e.target.value); setPage(1); }} className="field !py-2 text-sm text-basalt"><option value="">All photos</option><option value="used">In use</option><option value="unused">Not in use</option></select>
        </label>
        {mode === "pick" && <button type="button" disabled={!selected.length} onClick={() => onPick?.(selected, selected.map((id) => seen.current.get(id)).filter((x): x is MediaItem => !!x))} className="btn-primary !py-2.5 disabled:opacity-40">{pickLabel}{selected.length ? ` (${selected.length})` : ""}</button>}
      </div>
      <p role="status" className="mt-3 min-h-5 text-xs text-moss">{notice}</p>

      <div className={mode === "manage" ? "grid gap-10 lg:grid-cols-[1fr_300px]" : ""}>
        <div>
          {loadError ? (
            <div className="border-y border-basalt/15 py-12"><p className="font-serif text-2xl">The library could not load</p><button onClick={load} className="mt-3 text-sm underline underline-offset-4">Try again</button></div>
          ) : !loading && items.length === 0 ? (
            <div className="border-y border-basalt/15 py-12"><p className="font-serif text-2xl">{q || usage ? "No photos match" : "No photos yet"}</p><p className="mt-2 text-sm text-mist">{q || usage ? "Clear the search or filter." : "Drop photos above to start your library."}</p></div>
          ) : (
            <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${mode === "manage" ? "xl:grid-cols-4" : "lg:grid-cols-4"} ${loading ? "opacity-50" : ""}`}>
              {items.map((it) => {
                const on = selected.includes(it.id);
                return (
                  <li key={it.id}>
                    <button type="button" onClick={() => toggle(it.id)} aria-pressed={on} className={`group block w-full text-left outline-offset-2 ${on ? "outline outline-2 outline-brass" : ""}`}>
                      <div className="aspect-[4/3] overflow-hidden bg-stone">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.urls.thumbnail} alt={it.alt ?? ""} loading="lazy" decoding="async" width={320} height={240} className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-1.5 truncate text-xs">{it.name}</p>
                      <p className="text-xs text-mist">{it.width}×{it.height} · {kb(it.sizeBytes)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-mist">{total} photos, page {page} of {pages}</span>
              <span className="flex gap-6">
                {page > 1 && <button onClick={() => setPage(page - 1)} className="underline underline-offset-4">Previous</button>}
                {page < pages && <button onClick={() => setPage(page + 1)} className="underline underline-offset-4">Next</button>}
              </span>
            </div>
          )}
        </div>

        {mode === "manage" && (
          <aside aria-label="Photo details" className="border-t border-basalt/15 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            {current ? <Details key={current.id} item={current} onSave={save} onDelete={remove} onCopy={copy} /> : <p className="text-sm text-mist">Select a photo to rename it, add alt text, copy its URL or delete it.</p>}
          </aside>
        )}
      </div>
    </div>
  );
}

function Details({ item, onSave, onDelete, onCopy }: { item: MediaItem; onSave: (i: MediaItem, n: string, a: string) => void; onDelete: (i: MediaItem) => void; onCopy: (u: string) => void }) {
  const [name, setName] = useState(item.name);
  const [alt, setAlt] = useState(item.alt ?? "");
  return (
    <div className="space-y-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.urls.small} alt={item.alt ?? ""} className="w-full" />
      <label className="block text-xs text-mist">Name<input value={name} onChange={(e) => setName(e.target.value)} className="field text-basalt" /></label>
      <label className="block text-xs text-mist">Alt text<input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the photo" className="field text-basalt" /></label>
      <button onClick={() => onSave(item, name, alt)} className="btn-ghost !py-2.5 w-full">Save changes</button>
      <dl className="space-y-1 text-xs text-mist">
        <div className="flex justify-between"><dt>Dimensions</dt><dd>{item.width}×{item.height}</dd></div>
        <div className="flex justify-between"><dt>Original size</dt><dd>{kb(item.sizeBytes)}</dd></div>
        <div className="flex justify-between"><dt>WebP</dt><dd>{item.isWebp ? "Yes, 4 sizes" : "No"}</dd></div>
        <div className="flex justify-between"><dt>Uploaded</dt><dd>{new Date(item.createdAt).toLocaleDateString("en")}</dd></div>
      </dl>
      <div className="flex justify-between text-sm">
        <button onClick={() => onCopy(item.urls.large)} className="underline underline-offset-4 hover:text-brass">Copy URL</button>
        <button onClick={() => onDelete(item)} className="underline underline-offset-4 hover:text-brass">Delete</button>
      </div>
    </div>
  );
}
