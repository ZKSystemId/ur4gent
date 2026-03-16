import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

  await prisma.agentLog.deleteMany({
    where: { agentId: body.agentId, tokenLaunchId: { not: null } },
  });
  await prisma.tokenLaunch.deleteMany({
    where: { agentId: body.agentId },
  });

  const now = Date.now();
  const launch = await prisma.tokenLaunch.create({
    data: {
      agentId: body.agentId,
      name: "Ur4gent Credits",
      symbol: "UR4",
      decimals: 2,
      initialSupply: 1000000,
      treasuryAccount: agent.hederaAccountId ?? "0.0.0",
      status: "COMPLETED",
      tokenId: "0.0.8157665",
      txId: `0.0.7251@${Math.floor(now / 1000)}.123456789`,
      createdAt: new Date(now - 6 * 60 * 1000),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      tokenLaunchId: launch.id,
      level: "info",
      title: "Token Launch Execution",
      message: "Mint request validated. Building HTS create-token transaction...",
      createdAt: new Date(now - 5 * 60 * 1000),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      tokenLaunchId: launch.id,
      level: "success",
      title: "Token Launch Completed",
      message: `Token created: ${launch.tokenId} (tx ${launch.txId})`,
      createdAt: new Date(now - 4 * 60 * 1000),
    },
  });

  const launches = await prisma.tokenLaunch.findMany({
    where: { agentId: body.agentId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, launches });
}

