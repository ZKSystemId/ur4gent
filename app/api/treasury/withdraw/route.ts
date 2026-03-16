import { NextRequest, NextResponse } from "next/server";
import { withdrawAllFunds } from "@/services/treasuryEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { targetAddress, amount, agentIds } = await req.json();

    if (!targetAddress) {
      return NextResponse.json({ error: "Missing targetAddress" }, { status: 400 });
    }

    const requestedAmount = amount ? parseFloat(amount) : undefined;
    if (requestedAmount && isNaN(requestedAmount)) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const results = await withdrawAllFunds(targetAddress, requestedAmount, agentIds);
    
    return NextResponse.json({ 
        success: true, 
        results,
        totalWithdrawn: results.filter(r => r.status === "SUCCESS").reduce((sum, r) => sum + (r.amount || 0), 0)
    });
  } catch (error: unknown) {
    console.error("Withdraw error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
