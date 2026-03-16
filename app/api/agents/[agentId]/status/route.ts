import { NextResponse } from "next/server";
import { startAgentRuntime, stopAgentRuntime } from "@/services/agentRuntimeManager";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = await request.json();
  const { status } = body;

  if (!["active", "paused", "stopped"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (status === "active") {
    await startAgentRuntime(agentId);
  } else {
    await stopAgentRuntime(agentId);
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: { operationalStatus: status },
  });

  return NextResponse.json({ success: true, status });
}
