import { NextResponse } from "next/server";
import { setPaymentStatus } from "@/services/paymentService";
import { executePaymentBatch } from "@/services/actionExecutor";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const body = await request.json();
  const { status } = body as { status: string };

  if (!status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const isStart = status === "pending" || status === "executing";
  const nextStatus = status === "executing" ? "pending" : status;

  if (isStart) {
    if (payment.status === "executing") {
      return NextResponse.json({ success: true });
    }
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: nextStatus, scheduleAt: new Date() },
    });
  } else {
    await setPaymentStatus(paymentId, status);
  }

  if (isStart && payment.agentId) {
    void executePaymentBatch(payment.agentId);
  }

  return NextResponse.json({ success: true });
}
