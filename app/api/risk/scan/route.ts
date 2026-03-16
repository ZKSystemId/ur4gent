import { NextRequest, NextResponse } from "next/server";
import { scanForRisks } from "@/services/actionExecutor";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? "system";
  const result = await scanForRisks(agentId);
  return NextResponse.json(result);
}

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
  const blacklist = ["0.0.666", "0.0.31337"];
  const watchlist = [
    { address: "0.0.54321", reason: "Proxy upgradeable" },
    { address: "0.0.88888", reason: "Upgradeable admin" },
  ];

  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId: body.agentId, key: "risk_blacklist" } },
    update: { value: JSON.stringify(blacklist), type: "long_term" },
    create: {
      agentId: body.agentId,
      key: "risk_blacklist",
      value: JSON.stringify(blacklist),
      type: "long_term",
    },
  });

  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId: body.agentId, key: "risk_contract_watchlist" } },
    update: { value: JSON.stringify(watchlist), type: "long_term" },
    create: {
      agentId: body.agentId,
      key: "risk_contract_watchlist",
      value: JSON.stringify(watchlist),
      type: "long_term",
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "info",
      title: "Risk Demo Generated",
      message: "Injected demo risk data: blacklist, watchlist, payments, transactions.",
      data: JSON.stringify({ blacklist, watchlistCount: watchlist.length }),
    },
  });

  const payments = [
    { recipientAddress: "0.0.666", amount: 250, createdAt: new Date(now - 5 * 60 * 1000) },
    { recipientAddress: "0.0.54321", amount: 1200, createdAt: new Date(now - 10 * 60 * 1000) },
    { recipientAddress: "0.0.77777", amount: 350, createdAt: new Date(now - 15 * 60 * 1000) },
    { recipientAddress: "0.0.77777", amount: 360, createdAt: new Date(now - 25 * 60 * 1000) },
    { recipientAddress: "0.0.77777", amount: 380, createdAt: new Date(now - 35 * 60 * 1000) },
    { recipientAddress: "0.0.99999", amount: 6000, createdAt: new Date(now - 45 * 60 * 1000) },
  ];

  for (const p of payments) {
    await prisma.payment.create({
      data: {
        agentId: body.agentId,
        recipientAddress: p.recipientAddress,
        amount: p.amount,
        token: "HBAR",
        category: "Treasury",
        executionType: "Instant",
        status: "pending",
        createdAt: p.createdAt,
      },
    });
  }

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "warn",
      title: "Risk Signal: Phishing",
      message: "Detected transfer to blacklisted address (0.0.666).",
      data: JSON.stringify({ recipient: "0.0.666", amount: 250 }),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "warn",
      title: "Risk Signal: Suspicious Contract",
      message: "Contract flagged as proxy upgradeable.",
      data: JSON.stringify({ recipient: "0.0.54321", amount: 1200 }),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId: body.agentId,
      level: "warn",
      title: "Risk Signal: Wallet Behavior",
      message: "Recipient shows high-frequency incoming pattern.",
      data: JSON.stringify({ recipient: "0.0.77777", count: 3 }),
    },
  });

  await prisma.transaction.create({
    data: {
      fromAgentId: body.agentId,
      amount: 1500,
      status: "completed",
      txId: `demo-tx-${now}-1`,
      createdAt: new Date(now - 20 * 60 * 1000),
    },
  });

  await prisma.transaction.create({
    data: {
      fromAgentId: body.agentId,
      amount: 7000,
      status: "completed",
      txId: `demo-tx-${now}-2`,
      createdAt: new Date(now - 30 * 60 * 1000),
    },
  });

  const result = await scanForRisks(body.agentId);
  return NextResponse.json({ success: true, result });
}
