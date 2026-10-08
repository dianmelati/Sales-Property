import "server-only";
import { getStorage } from "./storage";

export type VariantKeys = Partial<Record<"thumbnail" | "small" | "medium" | "large" | "original" | "file", string>>;
export type VariantUrls = Record<"thumbnail" | "small" | "medium" | "large" | "file", string>;

export function variantUrls(variants: unknown): VariantUrls {
  const v = (variants ?? {}) as VariantKeys;
  const s = getStorage();
  const url = (k?: string) => (k ? s.publicUrl(k) : "");
  return { thumbnail: url(v.thumbnail), small: url(v.small), medium: url(v.medium ?? v.large), large: url(v.large ?? v.medium), file: url(v.file) };
}

export function allKeys(variants: unknown): string[] {
  return Object.values((variants ?? {}) as VariantKeys).filter((k): k is string => !!k);
}
