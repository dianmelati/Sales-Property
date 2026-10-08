"use client";

import { useRef, useState } from "react";
import { MediaBrowser } from "./media-browser";

export function ImagePicker({ name, initial, label = "Image" }: { name: string; initial: { id: string; url: string } | null; label?: string }) {
  const [img, setImg] = useState(initial);
  const [key, setKey] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <div>
      <p className="mb-2 text-xs text-mist">{label}</p>
      <input type="hidden" name={name} value={img?.id ?? ""} />
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.url} alt="" className="mb-3 aspect-[4/3] w-full max-w-sm object-cover" />
      ) : (
        <div className="mb-3 flex aspect-[4/3] w-full max-w-sm items-center justify-center bg-stone text-sm text-mist">No image chosen</div>
      )}
      <div className="flex gap-6 text-sm">
        <button type="button" onClick={() => { setKey((k) => k + 1); dialog.current?.showModal(); }} className="underline underline-offset-4 hover:text-brass">{img ? "Change image" : "Choose image"}</button>
        {img && <button type="button" onClick={() => setImg(null)} className="underline underline-offset-4 hover:text-brass">Remove</button>}
      </div>
      <dialog ref={dialog} aria-label="Choose an image" className="m-auto w-[min(1000px,94vw)] max-h-[90vh] overflow-y-auto bg-paper p-6 text-basalt backdrop:bg-basalt/60 lg:p-10">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl">Choose an image</h3>
          <button type="button" onClick={() => dialog.current?.close()} className="text-sm underline underline-offset-4">Close</button>
        </div>
        <MediaBrowser key={key} mode="pick" single pickLabel="Use this image"
          onPick={(_ids, items) => { if (items[0]) setImg({ id: items[0].id, url: items[0].urls.medium }); dialog.current?.close(); }} />
      </dialog>
    </div>
  );
}
