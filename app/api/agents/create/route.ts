import { NextResponse } from "next/server";
import { addAgent } from "@/lib/agentStore";
import { activateOperator } from "@/services/agentEngine";
import type { AgentRole } from "@/types/agent";

const roles: AgentRole[] = [
  "treasury_manager",
  "payment_operator",
  "blockchain_monitor",
  "risk_manager",
  "market_analyst",
];

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    name?: string;
    role?: AgentRole;
  };

  const role = payload.role ?? "treasury_manager";

  if (!payload.name || !roles.includes(role)) {
    return NextResponse.json(
      { error: "Invalid agent payload" },
      { status: 400 },
    );
  }

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL belum diatur di environment" },
        { status: 500 },
      );
    }
    if (!process.env.WALLET_SECRET_KEY) {
      return NextResponse.json(
        { error: "WALLET_SECRET_KEY belum diatur di environment" },
        { status: 500 },
      );
    }
    const agent = await addAgent({ name: payload.name, role });
    await activateOperator(agent.id);
    return NextResponse.json({ agent });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
