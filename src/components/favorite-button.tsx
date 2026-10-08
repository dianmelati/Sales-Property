"use client";

import { toggleFavorite, useFavorites } from "@/hooks/use-favorites";

export function FavoriteButton({ slug, title, className = "" }: { slug: string; title: string; className?: string }) {
  const saved = useFavorites().includes(slug);
  return (
    <button
      type="button" aria-pressed={saved} aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={() => { if (!toggleFavorite(slug)) alert("You can save up to 30 properties. Remove one to save another."); }}
      className={`flex h-10 w-10 items-center justify-center bg-paper/90 transition-colors hover:bg-paper ${className}`}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={saved ? "#A4824A" : "none"} stroke={saved ? "#A4824A" : "#1E2B2F"} strokeWidth="1.6">
        <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.600-7.500 10.200-7.500 10.200Z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
