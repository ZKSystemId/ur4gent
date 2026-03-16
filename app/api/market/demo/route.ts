import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runMarketEngine } from "@/services/marketEngine";

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

  const now = Date.now();

  await prisma.transaction.create({
    data: {
      fromAgentId: body.agentId,
      amount: 500000,
      status: "completed",
      txId: `whale-${now}`,
      createdAt: new Date(now - 10 * 60 * 1000),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "info",
      title: "Market Analyst",
      message: "Detecting token trends",
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "warn",
      title: "Whale Alert",
      message: "500k HBAR moved to exchange. Possible sell pressure.",
      data: JSON.stringify({ amount: 500000, direction: "to_exchange" }),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "success",
      title: "Market Sentiment",
      message: "Bullish (confidence 82%)",
    },
  });

  const result = await runMarketEngine(body.agentId);
  return NextResponse.json({ success: true, result });
}
