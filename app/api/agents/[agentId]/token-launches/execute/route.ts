import { NextRequest, NextResponse } from "next/server";
import { executeTokenLaunches } from "@/services/actionExecutor";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await prisma.agentLog.create({
    data: {
      agentId,
      level: "info",
      title: "Token Launch Execution",
      message: "Starting token creation pipeline...",
    },
  });

  try {
    const result = await executeTokenLaunches(agentId);
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.agentLog.create({
      data: {
        agentId,
        level: "error",
        title: "Token Launch Execution Failed",
        message,
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
