"use client";

import { useRef, useState, useTransition } from "react";
import { MediaBrowser } from "@/components/media-browser";
import { attachImages, moveImage, removeImage, setCover } from "@/server/properties/image-actions";

export interface AttachedImage { id: string; url: string; alt: string | null; name: string; isCover: boolean }

export function PropertyImages({ propertyId, images }: { propertyId: string; images: AttachedImage[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [pickerKey, setPickerKey] = useState(0);
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); });

  return (
    <section aria-labelledby="photos" className="mt-20 max-w-3xl border-t border-basalt/15 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="photos" className="text-3xl">Photos</h2>
          <p className="mt-2 text-sm text-mist">The cover photo appears first on cards and in the gallery. Changes here save immediately.</p>
        </div>
        <button type="button" onClick={() => { setPickerKey((k) => k + 1); dialog.current?.showModal(); }} className="btn-primary">Add photos</button>
      </div>

      {images.length === 0 ? (
        <div className="mt-8 border-y border-basalt/15 py-12"><p className="font-serif text-2xl">No photos yet</p><p className="mt-2 text-sm text-mist">Add photos from the library or upload new ones.</p></div>
      ) : (
        <ul className={`mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 ${pending ? "opacity-60" : ""}`}>
          {images.map((img, i) => (
            <li key={img.id}>
              <div className="relative aspect-[4/3] overflow-hidden bg-stone">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt ?? img.name} loading="lazy" className="h-full w-full object-cover" />
                {img.isCover && <span className="absolute left-2 top-2 bg-basalt px-2 py-1 text-xs text-paper">Cover</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <button type="button" disabled={i === 0} onClick={() => run(() => moveImage(propertyId, img.id, "up"))} className="underline underline-offset-4 disabled:no-underline disabled:opacity-30" aria-label={`Move ${img.name} earlier`}>Earlier</button>
                <button type="button" disabled={i === images.length - 1} onClick={() => run(() => moveImage(propertyId, img.id, "down"))} className="underline underline-offset-4 disabled:no-underline disabled:opacity-30" aria-label={`Move ${img.name} later`}>Later</button>
                {!img.isCover && <button type="button" onClick={() => run(() => setCover(propertyId, img.id))} className="underline underline-offset-4">Make cover</button>}
                <button type="button" onClick={() => run(() => removeImage(propertyId, img.id))} className="underline underline-offset-4 hover:text-brass">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dialog} aria-label="Choose photos" className="m-auto w-[min(1000px,94vw)] max-h-[90vh] overflow-y-auto bg-paper p-6 text-basalt backdrop:bg-basalt/60 lg:p-10">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl">Choose photos</h3>
          <button type="button" onClick={() => dialog.current?.close()} className="text-sm underline underline-offset-4">Close</button>
        </div>
        <MediaBrowser key={pickerKey} mode="pick" pickLabel="Add to property"
          onPick={(ids) => { dialog.current?.close(); run(() => attachImages(propertyId, ids)); }} />
      </dialog>
    </section>
  );
}
