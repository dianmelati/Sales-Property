"use server";

import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { LEAD_STATUSES, MANUAL_SOURCES, STATUS_LABEL, type LeadStatusKey } from "@/lib/leads";
import { audit } from "@/server/audit";
import { leadScope } from "./scope";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function updateLead(id: string, fd: FormData) {
  const user = await requirePermission("lead:write");
  const lead = await prisma.lead.findFirst({ where: { id, ...(await leadScope(user)) } });
  if (!lead) return;

  const data: Prisma.LeadUncheckedUpdateInput = {};
  const notes: string[] = [];

  const status = String(fd.get("status"));
  if ((LEAD_STATUSES as readonly string[]).includes(status) && status !== lead.status) {
    data.status = status as LeadStatusKey;
    notes.push(`Status changed from ${STATUS_LABEL[lead.status as LeadStatusKey]} to ${STATUS_LABEL[status as LeadStatusKey]}`);
  }

  // Agen tidak boleh memindahkan lead ke agen lain.
  if (user.role !== "AGENT") {
    const agentId = String(fd.get("agentId") ?? "") || null;
    if (agentId !== lead.agentId) {
      if (agentId) {
        const a = await prisma.agent.findFirst({ where: { id: agentId, deletedAt: null, isActive: true }, select: { name: true } });
        if (!a) return;
        notes.push(`Assigned to ${a.name}`);
      } else notes.push("Unassigned");
      data.agentId = agentId;
    }
  }

  const v = String(fd.get("viewingDate") ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(v) || v === "") {
    if (v !== day(lead.viewingAt)) {
      data.viewingAt = v ? new Date(`${v}T12:00:00Z`) : null;
      notes.push(v ? `Viewing set for ${v}` : "Viewing date cleared");
    }
  }
  if (!notes.length) return;

  await prisma.$transaction([
    prisma.lead.update({ where: { id }, data }),
    prisma.leadNote.createMany({ data: notes.map((body) => ({ leadId: id, authorId: user.id, body: `[Update] ${body}` })) }),
  ]);
  await audit({ userId: user.id, action: "lead.update", entity: "Lead", entityId: id, diff: { changes: notes } });
  revalidatePath(`/admin/leads/${id}`); revalidatePath("/admin/leads"); revalidatePath("/admin");
}

export async function addNote(id: string, fd: FormData) {
  const user = await requirePermission("lead:write");
  const body = z.string().trim().min(1).max(2000).safeParse(fd.get("body"));
  if (!body.success) return;
  const lead = await prisma.lead.findFirst({ where: { id, ...(await leadScope(user)) }, select: { id: true } });
  if (!lead) return;
  await prisma.leadNote.create({ data: { leadId: id, authorId: user.id, body: body.data } });
  await audit({ userId: user.id, action: "lead.note", entity: "Lead", entityId: id });
  revalidatePath(`/admin/leads/${id}`);
}

export interface LeadFormState { error?: string; errors?: Record<string, string> }

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(100),
  phone: z.string().trim().max(30).refine((v) => { const d = v.replace(/\D/g, "").length; return /^[+\d\s()-]+$/.test(v) && d >= 8 && d <= 15; }, "Enter a valid phone number"),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().email("Enter a valid email").max(254).optional()),
  message: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(1000).optional()),
  source: z.enum(MANUAL_SOURCES),
  propertyId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(40).optional()),
  agentId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(40).optional()),
});

export async function createLead(_: LeadFormState, fd: FormData): Promise<LeadFormState> {
  const user = await requirePermission("lead:write");
  const p = createSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return { error: "Please check the highlighted fields.", errors };
  }
  const v = p.data;
  let agentId = v.agentId ?? null;
  if (user.role === "AGENT") {
    // Lead yang dibuat agen otomatis menjadi miliknya, supaya tetap terlihat olehnya.
    const own = await prisma.agent.findFirst({ where: { userId: user.id, deletedAt: null }, select: { id: true } });
    if (!own) return { error: "Your login is not linked to an agent profile yet. Ask an administrator." };
    agentId = own.id;
  } else if (agentId && !(await prisma.agent.findFirst({ where: { id: agentId, deletedAt: null, isActive: true }, select: { id: true } }))) {
    return { error: "Choose a valid agent.", errors: { agentId: "Agent not found" } };
  }
  if (v.propertyId && !(await prisma.property.findFirst({ where: { id: v.propertyId, deletedAt: null }, select: { id: true } }))) {
    return { error: "Choose a valid property.", errors: { propertyId: "Property not found" } };
  }
  const lead = await prisma.lead.create({
    data: { name: v.name, phone: v.phone, email: v.email ?? null, message: v.message ?? null, source: v.source, propertyId: v.propertyId ?? null, agentId },
  });
  await audit({ userId: user.id, action: "lead.create", entity: "Lead", entityId: lead.id, diff: { source: v.source } });
  revalidatePath("/admin/leads"); revalidatePath("/admin");
  redirect(`/admin/leads/${lead.id}`);
}
