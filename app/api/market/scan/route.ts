import { NextResponse } from "next/server";
import { runMarketEngine } from "@/services/marketEngine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? "system";
  const result = await runMarketEngine(agentId);
  return NextResponse.json(result);
}
