import { NextResponse } from "next/server";
import { getTreasuryCfoSnapshot } from "@/services/treasuryEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cfo = await getTreasuryCfoSnapshot();
    return NextResponse.json({ cfo });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
