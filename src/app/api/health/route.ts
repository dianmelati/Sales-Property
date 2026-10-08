import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Untuk health check Docker, load balancer, dan pemantau uptime. Tidak membocorkan detail apa pun. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await prisma.siteSetting.findFirst({ select: { key: true } }); // ping database ringan
    return NextResponse.json({ status: "ok" }, { headers });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503, headers });
  }
}
