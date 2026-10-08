import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/client-ip";

export async function audit(entry: {
  userId?: string | null; action: string; entity: string; entityId?: string | null; diff?: unknown; ip?: string | null;
}) {
  let ip = entry.ip;
  if (ip === undefined) { try { ip = clientIp(await headers()); } catch { ip = null; } }
  if (ip === "unknown") ip = null;
  try {
    await prisma.auditLog.create({
      data: { ...entry, ip, diff: entry.diff === undefined ? undefined : JSON.parse(JSON.stringify(entry.diff)) },
    });
  } catch (e) {
    // Gagal mencatat audit tidak boleh menggagalkan aksi pengguna, tetapi harus terlihat di log server.
    console.error("audit log failed", e);
  }
}
