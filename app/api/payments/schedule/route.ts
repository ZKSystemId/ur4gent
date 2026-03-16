import { NextResponse } from "next/server";
import { schedulePayment } from "@/services/paymentScheduler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    agentId?: string;
    toAccountId?: string;
    amount?: number;
    scheduleAt?: string;
    memo?: string;
  };

  if (
    !payload.agentId ||
    !payload.toAccountId ||
    !payload.amount ||
    !payload.scheduleAt
  ) {
    return NextResponse.json(
      { error: "Invalid payment schedule payload" },
      { status: 400 },
    );
  }

  try {
    const schedule = await schedulePayment({
      agentId: payload.agentId,
      toAccountId: payload.toAccountId,
      amount: payload.amount,
      scheduleAt: payload.scheduleAt,
      memo: payload.memo,
    });
    return NextResponse.json({ schedule });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
