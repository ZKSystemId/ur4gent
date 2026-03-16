import { initializeRuntime } from "@/services/agentRuntimeManager";
import { prisma } from "@/lib/db";
import { addActivity } from "@/lib/activityStore";
import { runTreasuryMonitor } from "@/services/treasuryEngine";
import { scanForRisks } from "@/services/actionExecutor";
import { runMarketEngine } from "@/services/marketEngine";
import { runPaymentEngine } from "@/services/paymentEngine";
import { submitProofOfWork } from "@/blockchain/hederaClient";

let started = false;

export const initializeOperationsSystem = async () => {
  if (started) return;
  started = true;

  console.log("Initializing Operations System...");
  await initializeRuntime();
};

export const getOperationsHealth = () => {
  return {
    started,
    lastTickAt: new Date().toISOString(),
    runningServices: ["Agent Runtime", "Payment Engine", "Risk Monitor", "Treasury Allocator"],
    decisionCycles: 0,
    lastOperationAt: null,
  };
};

type OpsTrace = {
  coordinatorId: string;
  treasury?: { health?: string; totalBalanceHbar?: number; dailySpendHbar?: number };
  risk?: { risksFound: number; blockedCount: number };
  market?: { sentiment: string; confidence: number; alpha: string };
  payment?: { executed: number; failed: number };
  hcs?: { status: string; sequence?: string };
  timestamp: string;
};

const selectAgentByRole = async (role: string) => {
  return prisma.agent.findFirst({
    where: { role },
    orderBy: { createdAt: "desc" },
  });
};

export const runFullOpsCycle = async (coordinatorId?: string) => {
  const coordinator =
    (coordinatorId
      ? await prisma.agent.findUnique({ where: { id: coordinatorId } })
      : await prisma.agent.findFirst({ orderBy: { createdAt: "desc" } })) ??
    null;

  if (!coordinator) {
    throw new Error("No agents available for orchestration");
  }

  const treasuryAgent = await selectAgentByRole("treasury_manager");
  const riskAgent = await selectAgentByRole("risk_manager");
  const marketAgent = await selectAgentByRole("market_analyst");
  const paymentAgent = await selectAgentByRole("payment_operator");

  const trace: OpsTrace = {
    coordinatorId: coordinator.id,
    timestamp: new Date().toISOString(),
  };

  if (treasuryAgent) {
    await prisma.agentLog.deleteMany({
      where: { agentId: treasuryAgent.id, title: "AI Operation Cycle" },
    });
    const snapshot = await runTreasuryMonitor(treasuryAgent.id);
    trace.treasury = {
      health: snapshot.health,
      totalBalanceHbar: snapshot.totalBalanceHbar,
      dailySpendHbar: snapshot.dailySpendHbar,
    };
    await prisma.agentLog.create({
      data: {
        agentId: treasuryAgent.id,
        level: "info",
        title: "AI Operation Cycle",
        message: "[AI] Treasury Manager analyzing treasury status",
        data: JSON.stringify(trace.treasury),
      },
    });
  }

  if (riskAgent) {
    await prisma.agentLog.deleteMany({
      where: { agentId: riskAgent.id, title: "AI Operation Cycle" },
    });
    const riskResult = await scanForRisks(riskAgent.id);
    trace.risk = {
      risksFound: riskResult.risksFound,
      blockedCount: riskResult.blockedCount ?? 0,
    };
    await prisma.agentLog.create({
      data: {
        agentId: riskAgent.id,
        level: "info",
        title: "AI Operation Cycle",
        message: "[AI] Risk Monitor scanning suspicious transactions",
        data: JSON.stringify(trace.risk),
      },
    });
  }

  if (marketAgent) {
    await prisma.agentLog.deleteMany({
      where: { agentId: marketAgent.id, title: "AI Operation Cycle" },
    });
    const market = await runMarketEngine(marketAgent.id);
    trace.market = {
      sentiment: market.sentiment.marketSentiment,
      confidence: market.sentiment.confidence,
      alpha: market.alphaSignals[0]?.detail ?? "No alpha",
    };
    await prisma.agentLog.create({
      data: {
        agentId: marketAgent.id,
        level: "info",
        title: "AI Operation Cycle",
        message: "[AI] Market Analyst detecting token trends",
        data: JSON.stringify(trace.market),
      },
    });
  }

  if (paymentAgent) {
    await prisma.agentLog.deleteMany({
      where: { agentId: paymentAgent.id, title: "AI Operation Cycle" },
    });
    const payment = await runPaymentEngine(paymentAgent.id);
    const executed = Array.isArray(payment?.executed) ? payment.executed.length : payment?.count ?? 0;
    const failed = payment?.failed ?? 0;
    trace.payment = { executed, failed };
    await prisma.agentLog.create({
      data: {
        agentId: paymentAgent.id,
        level: "info",
        title: "AI Operation Cycle",
        message: "[AI] Payment Operator executing payroll",
        data: JSON.stringify(trace.payment),
      },
    });
  }

  const hcs = await submitProofOfWork(
    process.env.NEXT_PUBLIC_UCP_TOPIC_ID || "0.0.mock",
    `AI Ops Cycle: ${JSON.stringify(trace)}`
  );
  trace.hcs = { status: hcs.status, sequence: String(hcs.sequenceNumber ?? "") };

  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId: coordinator.id, key: "ops_decision_trace" } },
    update: { value: JSON.stringify(trace), type: "long_term" },
    create: {
      agentId: coordinator.id,
      key: "ops_decision_trace",
      value: JSON.stringify(trace),
      type: "long_term",
    },
  });

  await addActivity({
    type: "ai_operation",
    title: "AI Operation Cycle",
    detail: JSON.stringify({
      treasury: trace.treasury,
      risk: trace.risk,
      market: trace.market,
      payment: trace.payment,
    }),
    agentId: coordinator.id,
  });

  return trace;
};

export const getLatestOpsTrace = async () => {
  const latest = await prisma.agentMemory.findFirst({
    where: { key: "ops_decision_trace" },
    orderBy: { updatedAt: "desc" },
  });
  if (!latest?.value) return null;
  try {
    return JSON.parse(latest.value) as OpsTrace;
  } catch {
    return null;
  }
};
