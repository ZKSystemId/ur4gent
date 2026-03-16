import { NextResponse } from "next/server";
import { runMarketEngine } from "@/services/marketEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  // For demo: run a system market insight (agentId can be optional)
  const result = await runMarketEngine("system");
  return NextResponse.json(result);
}

