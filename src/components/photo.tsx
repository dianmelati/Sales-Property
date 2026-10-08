import { Facade } from "./facade";
import type { CardImage } from "@/types/property";

/**
 * Gambar responsif dari varian WebP yang sudah dibuat pipeline (srcset 640/1280/2200).
 * Lazy loading bawaan browser; blur placeholder sebagai latar sampai gambar siap. Tanpa gambar: placeholder arsitektural.
 */
export function Photo({ image, sizes, priority = false, className = "h-full w-full object-cover" }: { image: CardImage | null; sizes: string; priority?: boolean; className?: string }) {
  if (!image) return <Facade tone={0} className="h-full w-full" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src} srcSet={image.srcSet} sizes={sizes} alt={image.alt}
      width={image.width ?? undefined} height={image.height ?? undefined}
      loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : "auto"}
      style={image.blur ? { backgroundImage: `url(${image.blur})`, backgroundSize: "cover" } : undefined}
      className={className}
    />
  );
}
