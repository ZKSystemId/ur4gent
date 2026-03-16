import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: { ok: true, latencyMs: Date.now() - startedAt },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "DB connection failed";
    return NextResponse.json(
      {
        ok: false,
        db: { ok: false, latencyMs: Date.now() - startedAt, error: message },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

