import { NextResponse } from "next/server";
import { rentAgent } from "@/services/agentRentalService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      templateId: string;
      ownerId?: string;
      plan?: "starter" | "pro" | "enterprise";
    };

    if (!payload.templateId) {
      return NextResponse.json(
        { error: "Missing templateId" },
        { status: 400 },
      );
    }

    console.log("Renting agent with template:", payload.templateId);
    const agent = await rentAgent(payload.templateId, payload.ownerId, payload.plan ?? "enterprise");
    console.log("Agent rented successfully:", agent.id);
    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Error renting agent:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
