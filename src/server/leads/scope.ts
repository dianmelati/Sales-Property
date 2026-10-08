import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Role AGENT hanya melihat lead yang ditugaskan ke profil agennya. Role lain melihat semuanya. */
export async function leadScope(user: { id: string; role: string }): Promise<Prisma.LeadWhereInput> {
  if (user.role !== "AGENT") return {};
  const agent = await prisma.agent.findFirst({ where: { userId: user.id, deletedAt: null }, select: { id: true } });
  return { agentId: agent?.id ?? "__no_agent_profile__" };
}
