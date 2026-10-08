"use client";

import { toggleCompare, useCompare } from "@/hooks/use-compare";

export function CompareButton({ slug, title, className = "" }: { slug: string; title: string; className?: string }) {
  const on = useCompare().includes(slug);
  return (
    <button type="button" aria-pressed={on} aria-label={on ? `Remove ${title} from comparison` : `Add ${title} to comparison`}
      onClick={() => { if (!toggleCompare(slug)) alert("You can compare up to 3 properties. Remove one to add another."); }}
      className={`text-sm underline underline-offset-4 transition-colors hover:text-brass ${on ? "text-brass" : "text-mist"} ${className}`}>
      {on ? "In comparison" : "Compare"}
    </button>
  );
}
