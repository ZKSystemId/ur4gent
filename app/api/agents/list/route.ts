import { NextResponse } from "next/server";
import { getAgents } from "@/lib/agentStore";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ownerId =
    url.searchParams.get("ownerId") ??
    (await cookies()).get("ur4gent_ownerId")?.value ??
    null;
  const agents = await getAgents(ownerId);
  return NextResponse.json({ agents });
}
