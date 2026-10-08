import "server-only";
import type { CardImage } from "@/types/property";
import { variantUrls } from "./urls";

export function toCardImage(m: { variants: unknown; blurDataUrl: string | null; alt: string | null; width: number | null; height: number | null } | null | undefined, alt: string): CardImage | null {
  if (!m) return null;
  const u = variantUrls(m.variants);
  return { src: u.medium, srcSet: `${u.small} 640w, ${u.medium} 1280w, ${u.large} 2200w`, blur: m.blurDataUrl, alt: m.alt || alt, width: m.width, height: m.height };
}
