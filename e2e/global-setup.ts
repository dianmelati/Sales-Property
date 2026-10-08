import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { E2E } from "./constants";

/** Menyiapkan akun EDITOR dan AGENT beserta dua lead (satu milik agen) agar tes izin punya data. Aman dijalankan berulang. */
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const roles = Object.fromEntries(await Promise.all((["EDITOR", "AGENT"] as const).map(async (name) => [name, await prisma.role.upsert({ where: { name }, update: {}, create: { name } })])));
    const passwordHash = await hashPassword(E2E.password);
    await prisma.user.upsert({ where: { email: E2E.editor }, update: { passwordHash, isActive: true }, create: { email: E2E.editor, name: "E2E Editor", passwordHash, roleId: roles.EDITOR.id } });
    const agentUser = await prisma.user.upsert({ where: { email: E2E.agent }, update: { passwordHash, isActive: true }, create: { email: E2E.agent, name: "E2E Agent", passwordHash, roleId: roles.AGENT.id } });
    const agent = await prisma.agent.upsert({ where: { slug: "e2e-agent" }, update: { userId: agentUser.id, isActive: true }, create: { name: "E2E Agent", slug: "e2e-agent", userId: agentUser.id } });
    const other = await prisma.agent.upsert({ where: { slug: "e2e-other" }, update: {}, create: { name: "E2E Other", slug: "e2e-other" } });
    for (const [name, agentId] of [[E2E.ownLead, agent.id], [E2E.otherLead, other.id]] as const) {
      if (!(await prisma.lead.findFirst({ where: { name } }))) await prisma.lead.create({ data: { name, phone: "081300000099", source: "phone", agentId } });
    }
  } finally { await prisma.$disconnect(); }
}
