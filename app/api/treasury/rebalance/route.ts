import { NextRequest, NextResponse } from "next/server";
import { executeRebalance, getTreasuryStatus } from "@/services/treasuryEngine";

export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
    }

    const result = await executeRebalance(agentId);
    const updatedTreasury = await getTreasuryStatus(agentId);

    return NextResponse.json({ ...result, updatedTreasury });
  } catch (error: unknown) {
    console.error("Rebalance error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
