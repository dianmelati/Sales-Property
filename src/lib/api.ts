import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can, type PermissionKey } from "@/lib/auth/permissions";

const NO_STORE = { "Cache-Control": "no-store" };
export const ok = <T,>(data: T, status = 200) => NextResponse.json({ ok: true, data }, { status, headers: NO_STORE });
export const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ ok: false, error: { code, message } }, { status, headers: NO_STORE });

/** Permintaan harus berasal dari situs ini. Sec-Fetch-Site dikirim browser dan tidak bisa diubah oleh halaman lain. */
export function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host")); } catch { return false; }
}

/** Untuk route handler: balas JSON 401/403, bukan redirect. Permintaan yang mengubah data juga dicek Origin-nya. */
export async function apiAuth(req: Request, permission: PermissionKey, mutating = false) {
  if (mutating) {
    if (!sameOrigin(req)) return { error: fail("BAD_ORIGIN", "Request origin not allowed.", 403) } as const;
  }
  const user = await getCurrentUser();
  if (!user) return { error: fail("UNAUTHENTICATED", "Please sign in again.", 401) } as const;
  if (!can(user.role, permission)) return { error: fail("FORBIDDEN", "You do not have access to this action.", 403) } as const;
  return { user } as const;
}
