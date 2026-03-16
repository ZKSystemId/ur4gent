import { prisma } from "@/lib/db";
import { addActivity } from "@/lib/activityStore";
import { ensureAgentWallet } from "@/lib/agentStore";
import { generateOperationsDecision, generateMarketAnalysis } from "@/ai/deepseekClient";
import { getTreasuryStatus, runTreasuryMonitor, type TreasuryCfoSnapshot } from "@/services/treasuryEngine";
import { getDuePayments } from "@/services/paymentService";
import { executePaymentBatch, rebalanceTreasury, scanForRisks, executeTokenLaunches } from "@/services/actionExecutor";
import { runPaymentEngine } from "@/services/paymentEngine";
import { runRiskEngine } from "@/services/riskEngine";
import { runMarketEngine } from "@/services/marketEngine";

type OperationsDecision = {
  action:
    | "execute_payment"
    | "hold_funds"
    | "allocate_budget"
    | "alert_user"
    | "request_analysis"
    | "scan_transactions"
    | "rebalance_portfolio";
  reason: string;
  next_step: string;
  data?: unknown;
};

const parseDecision = (raw: string): OperationsDecision | null => {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonStr) as OperationsDecision;
    if (!parsed.action) return null;
    return parsed;
  } catch {
    return null;
  }
};

const logAgentEvent = async (agentId: string, level: string, title: string, message: string, data?: unknown, paymentId?: string) => {
  const shouldReplacePrevious =
    title === "AI Analysis" ||
    (title === "Role Action" && message.includes("Running Payment Engine cycle"));

  if (shouldReplacePrevious) {
    try {
      await prisma.agentLog.deleteMany({
        where: { agentId, title },
      });
    } catch (e) {
      console.error("Failed to clean routine logs:", e);
    }
  }

  await prisma.agentLog.create({
    data: {
      agentId,
      paymentId,
      level,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
    },
  });
};

export const runOperationsCycle = async (agentId: string, task?: string) => {
  const agent = await ensureAgentWallet(agentId);
  if (!agent) {
    throw new Error("Agent not found");
  }

  if (agent.operationalStatus !== "active") {
    return { agentId, status: "skipped", reason: `Agent is ${agent.operationalStatus}` };
  }

  const needsTreasury = agent.role === "treasury_manager";
  const needsPayments = agent.role === "payment_operator";

  const treasury = needsTreasury ? await getTreasuryStatus(agent.id) : null;
  const treasuryHbar =
    treasury?.assets.find((a) => a.symbol === "HBAR")?.amount ?? 0;
  let cfoSnapshot: TreasuryCfoSnapshot | null = null;
  if (needsTreasury) {
    cfoSnapshot = await runTreasuryMonitor(agent.id);
  }
  const duePayments = needsPayments ? await getDuePayments(agent.id) : [];
  
  // 1. AI Decision Phase
  let specificContext = "";
  if (agent.role === "treasury_manager") {
    const health = cfoSnapshot?.health ?? "GOOD";
    const totalBalance = cfoSnapshot?.totalBalanceHbar ?? 0;
    const dailySpend = cfoSnapshot?.dailySpendHbar ?? 0;
    const runway = cfoSnapshot?.runwayMonths !== null && cfoSnapshot?.runwayMonths !== undefined
      ? `${cfoSnapshot.runwayMonths} months`
      : "N/A";
    const allocation = cfoSnapshot?.allocationSuggestion ?? { operations: 40, liquidity: 35, reserve: 25 };
    specificContext = `Focus: Manage funds, allocate budget, monitor balance.
    Treasury Health: ${health}
    Balance: ${totalBalance.toFixed(2)} HBAR
    Daily Spend: ${dailySpend.toFixed(2)} HBAR
    Runway: ${runway}
    Allocation Suggestion: Operations ${allocation.operations}%, Liquidity ${allocation.liquidity}%, Reserve ${allocation.reserve}%
    Treasury Value (USD): ${treasury?.totalValueUsd?.toFixed?.(2) ?? "N/A"}
    Treasury HBAR: ${treasuryHbar.toFixed(2)} HBAR
    Strategy: ${agent.strategy}`;
  } else if (agent.role === "payment_operator") {
    specificContext = `Focus: Execute scheduled payments.
    Pending Payments: ${duePayments.length}
    Due Now: ${duePayments.length}`;
  } else if (agent.role === "risk_manager") {
    specificContext = `Focus: Detect anomalies, scan recent transactions.`;
  } else if (agent.role === "token_creator") {
    specificContext = `Focus: Create and manage tokens on Hedera.`;
  }

  const context = [
    `Operator: ${agent.name}`,
    `Role: ${agent.role}`,
    `Task: ${task ?? "Autonomous Operation"}`,
    `Wallet Balance: ${agent.balance.toFixed(2)} HBAR`,
    specificContext,
    `Respond with JSON ONLY: { "action": "...", "reason": "...", "next_step": "..." }`,
    `Valid actions: execute_payment, hold_funds, allocate_budget, alert_user, request_analysis, scan_transactions, rebalance_portfolio`
  ].join("\n");

  let decision: OperationsDecision = {
    action: "hold_funds",
    reason: "Default decision",
    next_step: "Wait for next cycle",
  };

  try {
    const rawDecision = await generateOperationsDecision(context);
    const parsed = parseDecision(rawDecision);
    if (parsed) decision = parsed;
    
    // We allow logging now, because the logAgentEvent function handles the cleanup/spam prevention
    await logAgentEvent(agent.id, "info", "AI Analysis", `Analyzed context: ${decision.reason}`);

  } catch (error) {
    await logAgentEvent(agent.id, "error", "AI Failure", "Failed to generate decision", { error: String(error) });
  }

  // 2. Role Engine Dispatch (REAL System State Changes)
  if (agent.role === "payment_operator") {
    // We log the cycle start, but our smart logger will remove the previous "Running cycle" log
    await logAgentEvent(agent.id, "info", "Role Action", "Running Payment Engine cycle...");
    await runPaymentEngine(agent.id);
    return { agentId: agent.id, decision, pendingPayments: duePayments.length, treasuryBalance: treasuryHbar };
  }

  if (agent.role === "token_creator") {
    await executeTokenLaunches(agent.id);
    return { agentId: agent.id, decision, pendingPayments: 0, treasuryBalance: treasuryHbar };
  }
  
  if (agent.role === "risk_manager") {
    await runRiskEngine(agent.id);
    return { agentId: agent.id, decision, pendingPayments: 0, treasuryBalance: treasuryHbar };
  }

  if (agent.role === "market_analyst") {
    await runMarketEngine(agent.id);
    return { agentId: agent.id, decision, pendingPayments: 0, treasuryBalance: treasuryHbar };
  }

  // Fallback for generic agents or Treasury Manager (using decision logic)
  if (decision.action === "execute_payment") {
    // ... existing fallback logic

    if (duePayments.length > 0) {
        await logAgentEvent(agent.id, "info", "Execution", `Executing ${duePayments.length} due payments...`);
        const { count, failed } = await executePaymentBatch(agent.id);
        if (count > 0) {
            await logAgentEvent(agent.id, "success", "Execution Complete", `Successfully executed ${count} payments.`);
        }
        if (failed > 0) {
            await logAgentEvent(agent.id, "error", "Execution Issues", `${failed} payments failed.`);
        }
    } else {
        await logAgentEvent(agent.id, "info", "Execution", "No payments due despite decision.");
    }
  }

  if (decision.action === "rebalance_portfolio" || decision.action === "allocate_budget") {
    const result = await rebalanceTreasury(agent.id, { strategy: agent.strategy });
    await logAgentEvent(agent.id, "success", "Treasury Ops", result.details ?? "");
  }

  if (decision.action === "scan_transactions") {
     const { risksFound } = await scanForRisks(agent.id);
     if (risksFound > 0) {
        await logAgentEvent(agent.id, "warn", "Risk Alert", `Found ${risksFound} suspicious transactions`);
     } 
     // Suppress "success" log for routine scans to avoid spam
  }

  if (decision.action === "alert_user") {
    await addActivity({
      type: "risk_warning",
      title: "Agent Alert",
      detail: decision.reason,
      agentId: agent.id,
    });
    await logAgentEvent(agent.id, "warn", "Manual Alert", decision.reason);
  }

  if (decision.action === "request_analysis") {
    await logAgentEvent(agent.id, "info", "Market Data", "Fetching real-time market data...");
    const analysis = await generateMarketAnalysis(
      `Analyze market conditions for ${agent.name} with strategy ${agent.strategy}`
    );
    await logAgentEvent(agent.id, "success", "Market Analysis", "Generated insight", { summary: analysis.slice(0, 50) + "..." });
  }

  return {
    agentId: agent.id,
    decision,
    pendingPayments: duePayments.length,
    treasuryBalance: treasuryHbar,
  };
};

export const runAgentOperation = runOperationsCycle;
