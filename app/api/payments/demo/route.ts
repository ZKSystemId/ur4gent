import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { agentId?: string };
  if (!body.agentId) {
    return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { id: body.agentId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const now = Date.now();

  await prisma.agentLog.deleteMany({
    where: { agentId: body.agentId, paymentId: { not: null } },
  });
  await prisma.payment.deleteMany({
    where: { agentId: body.agentId },
  });
  await prisma.activity.deleteMany({
    where: { agentId: body.agentId, type: { in: ["payment_created", "payment_executed", "on_chain_payment"] } },
  });

  const [p1, p2, p3] = await Promise.all([
    prisma.payment.create({
      data: {
        agentId: body.agentId,
        recipientAddress: "0.0.741233",
        amount: 12.5,
        token: "HBAR",
        category: "Payroll",
        executionType: "Scheduled",
        scheduleAt: new Date(now + 15 * 60 * 1000),
        status: "scheduled",
        description: "Community moderator payout (demo)",
        createdAt: new Date(now - 10 * 60 * 1000),
      },
    }),
    prisma.payment.create({
      data: {
        agentId: body.agentId,
        recipientAddress: "0.0.602991",
        amount: 4.2,
        token: "HBAR",
        category: "Subscription",
        executionType: "Instant",
        status: "pending",
        description: "Infra subscription (demo)",
        createdAt: new Date(now - 8 * 60 * 1000),
      },
    }),
    prisma.payment.create({
      data: {
        agentId: body.agentId,
        recipientAddress: "0.0.1289",
        amount: 25,
        token: "HBAR",
        category: "Bounty",
        executionType: "Instant",
        status: "completed",
        txId: `0.0.7251@${Math.floor(now / 1000)}.931663013`,
        executedAt: new Date(now - 3 * 60 * 1000),
        description: "Bounty reward payout (demo)",
        createdAt: new Date(now - 6 * 60 * 1000),
      },
    }),
  ]);

  await Promise.all([
    prisma.activity.create({
      data: {
        agentId: body.agentId,
        type: "payment_created",
        title: "Payment scheduled",
        detail: `Scheduled ${p1.amount} ${p1.token} to ${p1.recipientAddress}`,
        createdAt: p1.createdAt,
      },
    }),
    prisma.activity.create({
      data: {
        agentId: body.agentId,
        type: "payment_created",
        title: "Payment queued",
        detail: `Queued ${p2.amount} ${p2.token} to ${p2.recipientAddress}`,
        createdAt: p2.createdAt,
      },
    }),
    prisma.activity.create({
      data: {
        agentId: body.agentId,
        type: "payment_executed",
        title: "Payment executed",
        detail: `Sent ${p3.amount} ${p3.token} to ${p3.recipientAddress} (tx ${p3.txId})`,
        createdAt: p3.executedAt ?? p3.createdAt,
      },
    }),
  ]);

  await Promise.all([
    prisma.agentLog.create({
      data: {
        agentId: body.agentId,
        paymentId: p1.id,
        level: "info",
        title: "Payment Task",
        message: "Task created and scheduled. Waiting for execution window.",
        createdAt: p1.createdAt,
      },
    }),
    prisma.agentLog.create({
      data: {
        agentId: body.agentId,
        paymentId: p2.id,
        level: "info",
        title: "Payment Task",
        message: "Task queued. Pre-flight checks: risk score OK.",
        createdAt: p2.createdAt,
      },
    }),
    prisma.agentLog.create({
      data: {
        agentId: body.agentId,
        paymentId: p3.id,
        level: "success",
        title: "Payment Task",
        message: `Payment broadcasted and confirmed. Tx: ${p3.txId}`,
        createdAt: p3.executedAt ?? new Date(),
      },
    }),
  ]);

  const payments = await prisma.payment.findMany({
    where: { agentId: body.agentId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, payments });
}

