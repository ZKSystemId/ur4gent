import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const records = await prisma.agentMemory.findMany({
    where: { agentId, key: { in: ["payment_credits_total", "payment_credits_used"] } },
  });
  const totalRaw = records.find((r) => r.key === "payment_credits_total")?.value;
  const usedRaw = records.find((r) => r.key === "payment_credits_used")?.value ?? "0";
  if (!totalRaw) {
    return NextResponse.json({ credits: null });
  }
  const total = Number(totalRaw);
  const used = Number(usedRaw);
  const remaining = Math.max(0, total - used);
  return NextResponse.json({ credits: { total, used, remaining } });
}
