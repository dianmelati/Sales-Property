import { randomBytes, scrypt as _scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number, opts: ScryptOptions) => Promise<Buffer>;

// Format: scrypt$N$r$p$salt$hash. Format lama scrypt$salt$hash (N=16384) tetap bisa diverifikasi dan di-upgrade saat login.
const CURRENT = { N: 32768, r: 8, p: 1 } as const;
const LEGACY = { N: 16384, r: 8, p: 1 } as const;
const KEYLEN = 64;
const opts = (c: { N: number; r: number; p: number }): ScryptOptions => ({ N: c.N, r: c.r, p: c.p, maxmem: 128 * c.N * c.r * 2 });

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, KEYLEN, opts(CURRENT));
  return `scrypt$${CURRENT.N}$${CURRENT.r}$${CURRENT.p}$${salt}$${key.toString("hex")}`;
}

function parse(stored: string) {
  const p = stored.split("$");
  if (p[0] !== "scrypt") return null;
  if (p.length === 3) return { ...LEGACY, salt: p[1], hex: p[2] };
  if (p.length === 6) return { N: Number(p[1]), r: Number(p[2]), p: Number(p[3]), salt: p[4], hex: p[5] };
  return null;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const x = parse(stored);
  if (!x || !x.salt || !x.hex || !Number.isInteger(x.N) || x.N > 2 ** 17 || x.N < 2 ** 12) return false; // batas wajar agar hash rusak tidak memakan memori
  const expected = Buffer.from(x.hex, "hex");
  const actual = await scrypt(password, x.salt, expected.length, opts(x));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** True bila hash memakai format atau parameter lama. Dipanggil setelah login berhasil untuk menggantinya. */
export function needsRehash(stored: string): boolean {
  const x = parse(stored);
  return !x || x.N < CURRENT.N || x.r < CURRENT.r || x.p < CURRENT.p;
}

/** Hash tiruan berparameter sama dengan hash asli agar waktu respons tidak membocorkan keberadaan akun. */
export const DUMMY_HASH = `scrypt$${CURRENT.N}$${CURRENT.r}$${CURRENT.p}$${"0".repeat(32)}$${"0".repeat(128)}`;
