import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getHederaBalance } from "@/blockchain/hederaClient";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || !agent.hederaAccountId) {
    return NextResponse.json({ error: "Agent or Wallet not found" }, { status: 404 });
  }

  // Fetch from network
  const result = await getHederaBalance(agent.hederaAccountId);
  
  if (result.status === "success" || result.status === "mocked") {
      // Update local DB to match network
      await prisma.agent.update({
          where: { id: agentId },
          data: { balance: result.balance }
      });
      return NextResponse.json({ balance: result.balance, status: result.status });
  }

  return NextResponse.json(
    { balance: agent.balance, status: "error", error: "Failed to fetch balance" },
    { status: 200 },
  );
}
