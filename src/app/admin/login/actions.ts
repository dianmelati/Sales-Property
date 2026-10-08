"use server";

import { clientIp } from "@/lib/client-ip";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DUMMY_HASH, hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { hit } from "@/lib/rate-limit";
import { audit } from "@/server/audit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export interface LoginState { error?: string }

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and your password." };
  const { email, password } = parsed.data;

  const h = await headers();
  const ip = clientIp(h);

  // 5 percobaan / 15 menit per email, 20 / 15 menit per IP.
  const byEmail = (await hit(`login:e:${email}`, 5, 15 * 60_000));
  const byIp = (await hit(`login:ip:${ip}`, 20, 15 * 60_000));
  if (!byEmail.ok || !byIp.ok) {
    const wait = Math.ceil(Math.max(byEmail.retryAfterSec, byIp.retryAfterSec) / 60);
    return { error: `Too many attempts. Try again in ${wait} minute${wait > 1 ? "s" : ""}.` };
  }

  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: { role: true },
  });
  // Selalu jalankan verifikasi agar waktu respons tidak membocorkan keberadaan akun.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.isActive || !valid) {
    await audit({ userId: user?.id, action: "auth.login_failed", entity: "User", entityId: user?.id, ip });
    return { error: "Email or password is incorrect." };
  }

  if (needsRehash(user.passwordHash)) await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await createSession(user.id, user.role.name);
  await audit({ userId: user.id, action: "auth.login", entity: "User", entityId: user.id, ip });
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
