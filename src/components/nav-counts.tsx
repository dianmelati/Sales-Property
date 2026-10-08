"use client";

import Link from "next/link";
import { useCompare } from "@/hooks/use-compare";
import { useFavorites } from "@/hooks/use-favorites";

export function NavCounts() {
  const saved = useFavorites().length;
  const compare = useCompare().length;
  return (
    <span className="flex items-center gap-6 text-sm">
      {compare > 0 && <Link href="/compare" className="transition-colors hover:text-brass">Compare ({compare})</Link>}
      <Link href="/favorites" className="transition-colors hover:text-brass">Saved{saved > 0 ? ` (${saved})` : ""}</Link>
    </span>
  );
}
