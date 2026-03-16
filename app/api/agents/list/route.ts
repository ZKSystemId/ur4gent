import { NextResponse } from "next/server";
import { getAgents } from "@/lib/agentStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const agents = await getAgents();
  return NextResponse.json({ agents });
}
