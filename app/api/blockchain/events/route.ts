import { NextResponse } from "next/server";
import { getBlockchainEvents } from "@/services/blockchainMonitor";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await getBlockchainEvents(5);
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
