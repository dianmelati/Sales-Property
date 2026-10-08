import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export interface AboutContent { headline: string; body: string; imageId: string | null }
export interface ContactContent { headline: string; intro: string }

export const getAbout = cache(async (): Promise<AboutContent> => {
  const v = obj((await prisma.siteSetting.findUnique({ where: { key: "page.about" } }))?.value);
  return { headline: str(v.headline) || "About Estate", body: str(v.body), imageId: str(v.imageId) || null };
});

export const getContactContent = cache(async (): Promise<ContactContent> => {
  const v = obj((await prisma.siteSetting.findUnique({ where: { key: "page.contact" } }))?.value);
  return { headline: str(v.headline) || "Contact us", intro: str(v.intro) || "Tell us what you are looking for and an agent will get back to you." };
});
