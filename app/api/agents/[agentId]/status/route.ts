import { NextResponse } from "next/server";
import { startAgentRuntime, stopAgentRuntime } from "@/services/agentRuntimeManager";

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

  if (status === "active") {
    await startAgentRuntime(agentId);
  } else {
    await stopAgentRuntime(agentId);
  }

  return NextResponse.json({ success: true, status });
}
