import { NextResponse } from "next/server";
import {
  getOperationsHealth,
  initializeOperationsSystem,
} from "@/services/operationsOrchestrator";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = getOperationsHealth();
  if (!health.started) {
    // Lazy init if not started
    await initializeOperationsSystem();
    return NextResponse.json(getOperationsHealth());
  }
  return NextResponse.json(health);
}
