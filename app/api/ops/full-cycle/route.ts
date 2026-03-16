import { NextRequest, NextResponse } from "next/server";
import { runFullOpsCycle } from "@/services/operationsOrchestrator";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { agentId?: string };
  try {
    const trace = await runFullOpsCycle(body.agentId);
    return NextResponse.json({ success: true, trace });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
