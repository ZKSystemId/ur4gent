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

  const logs = [
    {
      level: "info",
      title: "AI Operation Cycle",
      message: "[AI] Treasury Manager analyzing treasury status",
    },
    {
      level: "info",
      title: "AI Operation Cycle",
      message: "[AI] Risk Monitor scanning suspicious transactions",
    },
    {
      level: "info",
      title: "AI Operation Cycle",
      message: "[AI] Market Analyst detecting token trends",
    },
    {
      level: "info",
      title: "AI Operation Cycle",
      message: "[AI] Payment Operator executing payroll",
    },
  ];

  for (const log of logs) {
    await prisma.agentLog.create({
      data: {
        agentId: body.agentId,
        level: log.level,
        title: log.title,
        message: log.message,
      },
    });
  }

  return NextResponse.json({ success: true });
}
