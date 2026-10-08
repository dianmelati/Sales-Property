/** Hanya tautan internal, http(s), mailto, tel, dan anchor. Menolak javascript: dan sejenisnya. */
export const isSafeHref = (h: string) => /^(\/(?!\/)|https?:\/\/|mailto:|tel:|#)/i.test(h.trim());
export const safeHref = (h?: string | null) => (h && isSafeHref(h) ? h.trim() : "#");
