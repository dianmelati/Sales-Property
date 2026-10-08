"use server";

import { clientIp } from "@/lib/client-ip";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hit } from "@/lib/rate-limit";

export interface InquiryState { ok?: boolean; name?: string; error?: string; errors?: Record<string, string> }

const schema = z.object({
  kind: z.enum(["inquiry", "viewing"]),
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.string().trim().max(30).refine((v) => { const d = v.replace(/\D/g, "").length; return /^[+\d\s()-]+$/.test(v) && d >= 8 && d <= 15; }, "Enter a valid phone number"),
  email: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().email("Enter a valid email").max(254).optional()),
  message: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(1000).optional()),
  viewingDate: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

export async function submitInquiry(propertyId: string, _: InquiryState, formData: FormData): Promise<InquiryState> {
  // Honeypot: bot mengisi kolom tersembunyi. Balas sukses agar tidak memberi petunjuk.
  if (formData.get("website")) return { ok: true, name: "there" };

  const ip = clientIp(await headers());
  const limit = (await hit(`inquiry:${ip}`, 5, 60 * 60_000));
  if (!limit.ok) return { error: "You have sent several messages already. Please try again later or contact us on WhatsApp." };

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { error: "Please check the highlighted fields.", errors };
  }
  const v = parsed.data;

  let viewingAt: Date | null = null;
  if (v.kind === "viewing") {
    if (!v.viewingDate) return { error: "Please check the highlighted fields.", errors: { viewingDate: "Choose a preferred date" } };
    const d = new Date(`${v.viewingDate}T12:00:00Z`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (Number.isNaN(d.getTime()) || d < today || d.getTime() - today.getTime() > 366 * 864e5) {
      return { error: "Please check the highlighted fields.", errors: { viewingDate: "Choose a date within the next year" } };
    }
    viewingAt = d;
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null, status: { in: ["PUBLISHED", "RESERVED"] } }, select: { id: true, agentId: true },
  });
  if (!property) return { error: "This property is no longer available for enquiries." };

  await prisma.lead.create({
    data: {
      name: v.name, phone: v.phone, email: v.email ?? null, message: v.message ?? null,
      source: v.kind === "viewing" ? "viewing_request" : "inquiry_form",
      propertyId: property.id, agentId: property.agentId, viewingAt,
    },
  });
  return { ok: true, name: v.name.split(" ")[0] };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.string().trim().max(30).refine((v) => { const d = v.replace(/\D/g, "").length; return /^[+\d\s()-]+$/.test(v) && d >= 8 && d <= 15; }, "Enter a valid phone number"),
  email: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().email("Enter a valid email").max(254).optional()),
  message: z.string().trim().min(5, "Tell us a little about what you need").max(1000),
});

/** Formulir halaman Kontak: lead umum tanpa properti. */
export async function submitContact(_: InquiryState, formData: FormData): Promise<InquiryState> {
  if (formData.get("website")) return { ok: true, name: "there" };
  const ip = clientIp(await headers());
  if (!(await hit(`inquiry:${ip}`, 5, 60 * 60_000)).ok) return { error: "You have sent several messages already. Please try again later or contact us on WhatsApp." };
  const p = contactSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return { error: "Please check the highlighted fields.", errors };
  }
  await prisma.lead.create({ data: { name: p.data.name, phone: p.data.phone, email: p.data.email ?? null, message: p.data.message, source: "contact_page" } });
  return { ok: true, name: p.data.name.split(" ")[0] };
}
