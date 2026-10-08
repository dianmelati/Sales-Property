// Hanya memakai `jose` sehingga aman dijalankan di middleware (Edge runtime).
import { SignJWT, jwtVerify } from "jose";

// Awalan __Host- (hanya produksi/HTTPS): cookie wajib Secure, Path=/, dan tidak bisa ditimpa dari subdomain.
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-estate_session" : "estate_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 jam

export interface SessionPayload {
  sub: string; // user id
  role: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "AGENT";
  iat?: number; // detik, hanya terisi saat verifikasi
}

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32 || secret.includes("ganti-dengan")) throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ role: p.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role as SessionPayload["role"], iat: payload.iat };
  } catch {
    return null;
  }
}
