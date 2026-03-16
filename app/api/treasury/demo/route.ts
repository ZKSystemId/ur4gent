import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTreasuryCfoSnapshot, getTreasuryStatus } from "@/services/treasuryEngine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { agentId?: string };
  if (!body.agentId) {
    return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { id: body.agentId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await prisma.agentLog.deleteMany({ where: { agentId: body.agentId } });
  await prisma.tokenLaunch.deleteMany({ where: { agentId: body.agentId } });
  await prisma.payment.deleteMany({ where: { agentId: body.agentId } });
  await prisma.blockchainEvent.deleteMany({ where: { agentId: body.agentId } });
  await prisma.activity.deleteMany({ where: { agentId: body.agentId } });
  await prisma.agentMemory.deleteMany({ where: { agentId: body.agentId } });
  await prisma.transaction.deleteMany({
    where: { OR: [{ fromAgentId: body.agentId }, { toAgentId: body.agentId }] },
  });

  const now = Date.now();
  const txId = `treasury-anomaly-${now}`;

  await prisma.blockchainEvent.create({
    data: {
      agentId: body.agentId,
      eventType: "treasury_anomaly",
      detail: "Unusual spending detected: 1,250 HBAR to 0.0.741233",
      txId,
      createdAt: new Date(now - 7 * 60 * 1000),
    },
  });

  await prisma.activity.create({
    data: {
      agentId: body.agentId,
      type: "treasury_alert",
      title: "Unusual spending detected",
      detail: "Amount: 1,250 HBAR | Recipient: 0.0.741233 | Action: require approval",
      createdAt: new Date(now - 6 * 60 * 1000),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "warn",
      title: "Abnormal Spending Detection",
      message: "⚠ Unusual spending detected: 1,250 HBAR to 0.0.741233 (approval required)",
      data: JSON.stringify({ txId, amountHbar: 1250, recipient: "0.0.741233", action: "require_approval" }),
      createdAt: new Date(now - 6 * 60 * 1000),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "info",
      title: "Treasury Demo",
      message: "Generating portfolio health snapshot and rebalancing hints...",
      createdAt: new Date(now - 5 * 60 * 1000),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "success",
      title: "Treasury Ops",
      message: "Suggested allocation: 40% HBAR / 40% USDC / 20% SAUCE (risk-balanced)",
      createdAt: new Date(now - 4 * 60 * 1000),
    },
  });

  const [treasury, cfo] = await Promise.all([
    getTreasuryStatus(body.agentId),
    getTreasuryCfoSnapshot(),
  ]);

  return NextResponse.json({ success: true, treasury, cfo });
}
