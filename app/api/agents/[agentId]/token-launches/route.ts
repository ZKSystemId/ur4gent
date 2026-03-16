import { NextRequest, NextResponse } from "next/server";
import { createTokenLaunch, getTokenLaunches } from "@/services/tokenService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const launches = await getTokenLaunches(agentId);
  return NextResponse.json({ launches });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = await req.json();
  
  const launch = await createTokenLaunch(agentId, body);
  return NextResponse.json({ launch });
}
