import { NextResponse } from "next/server";
import { getLatestOpsTrace } from "@/services/operationsOrchestrator";

export const dynamic = "force-dynamic";

export async function GET() {
  const trace = await getLatestOpsTrace();
  return NextResponse.json({ trace });
}
