"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PropertyCard } from "@/components/property-card";
import { useFavorites } from "@/hooks/use-favorites";
import type { PublicCard } from "@/types/property";

export function FavoritesList() {
  const slugs = useFavorites();
  const [items, setItems] = useState<PublicCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const key = slugs.join(",");

  useEffect(() => {
    if (!key) { setItems([]); return; }
    let live = true;
    setFailed(false);
    fetch(`/api/properties/by-slug?slugs=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((r) => { if (live) r.ok ? setItems(r.data) : setFailed(true); })
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [key]);

  if (failed) return <p className="mt-10 text-sm">Your saved properties could not load. Refresh the page to try again.</p>;
  if (items === null) return <p className="mt-10 text-sm text-mist" aria-busy="true">Loading your saved properties</p>;
  const shown = items.filter((i) => slugs.includes(i.slug));
  if (shown.length === 0) {
    return (
      <div className="mt-10 border-y border-basalt/15 py-16">
        <p className="font-serif text-3xl">Nothing saved yet</p>
        <p className="mt-3 max-w-md text-sm text-mist">Use the heart on any property to keep it here. Saved properties stay on this device.</p>
        <Link href="/properties" className="btn-primary mt-8">Browse properties</Link>
      </div>
    );
  }
  return <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">{shown.map((p) => <PropertyCard key={p.id} p={p} />)}</div>;
}
