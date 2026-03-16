import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTreasuryCfoSnapshot } from "@/services/treasuryEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfo = await getTreasuryCfoSnapshot();
  return NextResponse.json({ cfo });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      agentId?: string;
    };

    if (!payload.agentId) {
      return NextResponse.json(
        { error: "Missing agentId" },
        { status: 400 },
      );
    }

    const cfo = await getTreasuryCfoSnapshot();
    const proposal = cfo.allocationSuggestion;

    await prisma.agentLog.create({
      data: {
        agentId: payload.agentId,
        level: "info",
        title: "Budget Proposal",
        message: `Treasury Allocation Suggestion: Operations ${proposal.operations}%, Liquidity ${proposal.liquidity}%, Reserve ${proposal.reserve}%`,
        data: JSON.stringify({ proposal, runwayMonths: cfo.runwayMonths, dailySpendHbar: cfo.dailySpendHbar }),
      },
    });

    await prisma.activity.create({
      data: {
        agentId: payload.agentId,
        type: "treasury_alert",
        title: "Budget Proposal Generated",
        detail: `Operations ${proposal.operations}% | Liquidity ${proposal.liquidity}% | Reserve ${proposal.reserve}%`,
      },
    });

    return NextResponse.json({ success: true, proposal });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
