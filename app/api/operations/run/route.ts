import { NextResponse } from "next/server";
import { getAgents } from "@/lib/agentStore";
import { runOperationsCycle } from "@/services/operationsEngine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    agentId?: string;
    task?: string;
    cycles?: number;
  };

  const agents = await getAgents();
  if (agents.length === 0) {
    return NextResponse.json(
      { error: "No operators available" },
      { status: 400 },
    );
  }

  const selectedAgent =
    agents.find((agent) => agent.id === payload.agentId) ?? agents[0];
  const cycles = payload.cycles ?? 1;
  const results = [];

  try {
    for (let index = 0; index < cycles; index += 1) {
      const result = await runOperationsCycle(
        selectedAgent.id,
        payload.task,
      );
      results.push(result);
    }
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
