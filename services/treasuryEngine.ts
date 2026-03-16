import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getHederaBalance, sendHbarPayment } from "@/blockchain/hederaClient";
import { decryptPrivateKey } from "@/services/walletService";

export type TreasuryAsset = {
  symbol: string;
  name: string;
  amount: number;
  valueUsd: number;
  allocation: number; // percentage
  targetAllocation: number;
};

export type TreasuryStatus = {
  totalValueUsd: number;
  assets: TreasuryAsset[];
  alerts: string[];
  recommendations: string[];
  recentActivity: { action: string; timestamp: Date; details: string }[];
};

const MOCK_PRICES = {
  HBAR: 0.12,
  USDC: 1.0,
  SAUCE: 0.08,
  CLXY: 0.04
};

export type TreasuryHealth = "GOOD" | "ALERT";

export type TreasuryWalletSnapshot = {
  agentId: string;
  name: string;
  hederaAccountId: string | null;
  balanceHbar: number;
};

export type TreasuryAnomaly = {
  id: string;
  amountHbar: number;
  recipient: string;
  sourceAgentId: string | null;
  sourceAgentName: string | null;
  txId: string | null;
  detectedAt: Date;
  reason: string;
};

export type TreasuryAllocationSuggestion = {
  operations: number;
  liquidity: number;
  reserve: number;
};

export type TreasuryCfoSnapshot = {
  health: TreasuryHealth;
  walletCount: number;
  totalBalanceHbar: number;
  dailySpendHbar: number;
  runwayMonths: number | null;
  runwayDays: number | null;
  allocationSuggestion: TreasuryAllocationSuggestion;
  anomalies: TreasuryAnomaly[];
  wallets: TreasuryWalletSnapshot[];
};

type TreasuryPortfolio = {
  USDC: number;
  SAUCE: number;
  CLXY?: number;
};

const TREASURY_PORTFOLIO_KEY = "treasury_portfolio";

const getOrInitPortfolio = async (agentId: string) => {
  const existing = await prisma.agentMemory.findUnique({
    where: { agentId_key: { agentId, key: TREASURY_PORTFOLIO_KEY } },
  });

  if (existing) {
    try {
      return JSON.parse(existing.value) as TreasuryPortfolio;
    } catch {
      // fallthrough
    }
  }

  const initial: TreasuryPortfolio = {
    USDC: 5000,
    SAUCE: 25000,
  };

  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId, key: TREASURY_PORTFOLIO_KEY } },
    update: { value: JSON.stringify(initial), type: "long_term" },
    create: {
      agentId,
      key: TREASURY_PORTFOLIO_KEY,
      value: JSON.stringify(initial),
      type: "long_term",
    },
  });

  return initial;
};

const setPortfolio = async (agentId: string, portfolio: TreasuryPortfolio) => {
  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId, key: TREASURY_PORTFOLIO_KEY } },
    update: { value: JSON.stringify(portfolio), type: "long_term" },
    create: {
      agentId,
      key: TREASURY_PORTFOLIO_KEY,
      value: JSON.stringify(portfolio),
      type: "long_term",
    },
  });
};

const formatHbar = (value: number) => Number(value.toFixed(2));

export const getTreasuryCfoSnapshot = async (): Promise<TreasuryCfoSnapshot> => {
  const agents = await prisma.agent.findMany({
    select: { id: true, name: true, hederaAccountId: true, balance: true },
    orderBy: { createdAt: "desc" },
  });

  const wallets: TreasuryWalletSnapshot[] = agents.map((a) => ({
    agentId: a.id,
    name: a.name,
    hederaAccountId: a.hederaAccountId,
    balanceHbar: formatHbar(a.balance),
  }));

  const walletCount = wallets.length;
  const totalBalanceHbar = formatHbar(wallets.reduce((sum, w) => sum + w.balanceHbar, 0));

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const payments24h = await prisma.payment.findMany({
    where: {
      status: "completed",
      executedAt: { gte: last24h },
      token: "HBAR",
    },
    select: {
      id: true,
      agentId: true,
      recipientAddress: true,
      amount: true,
      txId: true,
      executedAt: true,
    },
    orderBy: { executedAt: "desc" },
    take: 100,
  });

  const dailySpendHbar = formatHbar(
    payments24h.reduce((sum, p) => sum + (p.amount || 0), 0),
  );

  const payments7d = await prisma.payment.findMany({
    where: {
      status: "completed",
      executedAt: { gte: last7d },
      token: "HBAR",
    },
    select: { amount: true },
  });

  const totalSpend7d = payments7d.reduce((sum, p) => sum + (p.amount || 0), 0);
  const avgDailySpend = totalSpend7d > 0 ? totalSpend7d / 7 : 0;
  const runwayDays = avgDailySpend > 0 ? totalBalanceHbar / avgDailySpend : null;
  const runwayMonths = runwayDays !== null ? runwayDays / 30 : null;

  const threshold = 1000;
  const knownAccounts = new Set(
    wallets
      .map((w) => w.hederaAccountId)
      .filter((id): id is string => Boolean(id)),
  );

  const anomalies: TreasuryAnomaly[] = payments24h
    .filter((p) => (p.amount || 0) >= threshold)
    .map((p) => {
      const source = wallets.find((w) => w.agentId === p.agentId) ?? null;
      const recipientKnown = knownAccounts.has(p.recipientAddress);
      const reason = recipientKnown
        ? "High value transfer (internal)"
        : "Unusual spending detected";

      return {
        id: p.id,
        amountHbar: formatHbar(p.amount || 0),
        recipient: p.recipientAddress,
        sourceAgentId: p.agentId ?? null,
        sourceAgentName: source?.name ?? null,
        txId: p.txId ?? null,
        detectedAt: p.executedAt ?? now,
        reason,
      };
    });

  const allocationSuggestion: TreasuryAllocationSuggestion =
    runwayMonths !== null && runwayMonths < 6
      ? { operations: 30, liquidity: 30, reserve: 40 }
      : { operations: 40, liquidity: 35, reserve: 25 };

  const health: TreasuryHealth =
    anomalies.length > 0 || totalBalanceHbar < 100 ? "ALERT" : "GOOD";

  return {
    health,
    walletCount,
    totalBalanceHbar,
    dailySpendHbar,
    runwayMonths: runwayMonths !== null ? Number(runwayMonths.toFixed(1)) : null,
    runwayDays: runwayDays !== null ? Number(runwayDays.toFixed(0)) : null,
    allocationSuggestion,
    anomalies,
    wallets,
  };
};

export const runTreasuryMonitor = async (treasuryManagerAgentId: string) => {
  const snapshot = await getTreasuryCfoSnapshot();

  if (snapshot.anomalies.length === 0) return snapshot;

  for (const anomaly of snapshot.anomalies) {
    const existing = await prisma.blockchainEvent.findFirst({
      where: {
        eventType: "treasury_anomaly",
        txId: anomaly.txId ?? undefined,
      },
    });

    if (existing) continue;

    await prisma.blockchainEvent.create({
      data: {
        agentId: anomaly.sourceAgentId ?? undefined,
        eventType: "treasury_anomaly",
        detail: `${anomaly.reason}: ${anomaly.amountHbar} HBAR to ${anomaly.recipient}`,
        txId: anomaly.txId ?? undefined,
      },
    });

    await prisma.activity.create({
      data: {
        agentId: treasuryManagerAgentId,
        type: "treasury_alert",
        title: "Unusual spending detected",
        detail: `Amount: ${anomaly.amountHbar} HBAR | Source: ${anomaly.sourceAgentName ?? "unknown"} | Recipient: ${anomaly.recipient}`,
      },
    });

    await prisma.agentLog.create({
      data: {
        agentId: treasuryManagerAgentId,
        level: "warn",
        title: "Abnormal Spending Detection",
        message: `⚠ Unusual spending detected: ${anomaly.amountHbar} HBAR to ${anomaly.recipient}`,
        data: JSON.stringify(anomaly),
      },
    });
  }

  return snapshot;
};

export const getTreasuryStatus = async (
  agentId?: string,
): Promise<TreasuryStatus> => {
  try {
    let totalHbar = 0;
    let portfolio: TreasuryPortfolio | null = null;

    if (agentId) {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      totalHbar = agent?.balance || 0;
      portfolio = await getOrInitPortfolio(agentId);
    } else {
      const agents = await prisma.agent.findMany();
      totalHbar = agents.reduce((sum, a) => sum + a.balance, 0);
    }

    const usdcAmount = portfolio?.USDC ?? 5000;
    const sauceAmount = portfolio?.SAUCE ?? 25000;
    const clxyAmount = portfolio?.CLXY ?? 0;

    const assets: TreasuryAsset[] = [
      {
        symbol: "HBAR",
        name: "Hedera",
        amount: totalHbar,
        valueUsd: totalHbar * MOCK_PRICES.HBAR,
        allocation: 0,
        targetAllocation: 40,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        amount: usdcAmount,
        valueUsd: usdcAmount * MOCK_PRICES.USDC,
        allocation: 0,
        targetAllocation: 40,
      },
      {
        symbol: "SAUCE",
        name: "Sauce Inu",
        amount: sauceAmount,
        valueUsd: sauceAmount * MOCK_PRICES.SAUCE,
        allocation: 0,
        targetAllocation: 20,
      },
      ...(clxyAmount > 0
        ? ([
            {
              symbol: "CLXY",
              name: "Calaxy",
              amount: clxyAmount,
              valueUsd: clxyAmount * MOCK_PRICES.CLXY,
              allocation: 0,
              targetAllocation: 0,
            },
          ] satisfies TreasuryAsset[])
        : []),
    ];

    const totalValueUsd = assets.reduce((sum, a) => sum + a.valueUsd, 0);

    assets.forEach((a) => {
      a.allocation = totalValueUsd > 0 ? (a.valueUsd / totalValueUsd) * 100 : 0;
    });

    const alerts: string[] = [];
    const recommendations: string[] = [];

    if (totalHbar < 100) {
      alerts.push("Low HBAR Balance for Gas Fees (< 100 HBAR)");
    }

    const hbarAsset = assets.find((a) => a.symbol === "HBAR");
    if (hbarAsset && hbarAsset.allocation > 60) {
      recommendations.push("HBAR allocation > 60%. Suggest rebalancing to USDC.");
    }

    const recentActivity = await prisma.agentLog.findMany({
      where: agentId ? { agentId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 5,
    }).then((logs) => logs.map((l) => ({
        action: l.title,
        timestamp: l.createdAt,
        details: l.message
    })));

    return {
      totalValueUsd,
      assets,
      alerts,
      recommendations,
      recentActivity
    };
  } catch (error) {
    console.error("Failed to load treasury status:", error);
    return {
      totalValueUsd: 0,
      assets: [],
      alerts: ["Treasury data unavailable (database connection failed)."],
      recommendations: [],
      recentActivity: [],
    };
  }
};

export const executeRebalance = async (agentId: string) => {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error("Agent not found");

  const portfolio = await getOrInitPortfolio(agentId);

  if (agent.balance <= 0) {
    await prisma.agentLog.create({
      data: {
        agentId,
        level: "warn",
        title: "Rebalance Skipped",
        message: "Insufficient HBAR for execution.",
        data: JSON.stringify({ hbarBalance: agent.balance }),
      },
    });
    await prisma.activity.create({
      data: {
        agentId,
        type: "treasury_alert",
        title: "Treasury Rebalance Skipped",
        detail: "Insufficient HBAR for execution.",
      },
    });
    return { success: false, reason: "insufficient_hbar" as const };
  }

  const swapHbar = Math.max(50, Math.min(1000, agent.balance * 0.2));
  const receivedUsdc = Number((swapHbar * MOCK_PRICES.HBAR).toFixed(2));

  const nextPortfolio: TreasuryPortfolio = {
    ...portfolio,
    USDC: Number(((portfolio.USDC ?? 0) + receivedUsdc).toFixed(2)),
    SAUCE: portfolio.SAUCE ?? 0,
    CLXY: portfolio.CLXY ?? 0,
  };

  await setPortfolio(agentId, nextPortfolio);

  await prisma.agentLog.create({
    data: {
      agentId,
      level: "info",
      title: "Rebalance Executed",
      message: `Swapped ${swapHbar.toFixed(0)} HBAR for ${receivedUsdc.toFixed(2)} USDC (Simulated)`,
      data: JSON.stringify({ protocol: "SaucerSwap", pair: "HBAR/USDC", swapHbar, receivedUsdc }),
    },
  });

  await prisma.activity.create({
    data: {
      agentId,
      type: "treasury_alert",
      title: "Treasury Rebalance Executed",
      detail: `Swapped ${swapHbar.toFixed(0)} HBAR for ${receivedUsdc.toFixed(2)} USDC (Simulated)`,
    },
  });

  return { success: true, txId: `0.0.${Date.now()}`, swapHbar, receivedUsdc };
};

export const withdrawAllFunds = async (targetAddress: string, requestedAmount?: number, filterAgentIds?: string[]) => {
  const whereClause: Prisma.AgentWhereInput = { balance: { gt: 5 } };
  
  if (filterAgentIds && filterAgentIds.length > 0) {
      whereClause.id = { in: filterAgentIds };
  }

  const agents = await prisma.agent.findMany({
    where: whereClause,
    include: { walletSecret: true },
    orderBy: { balance: 'desc' } // Take from richest agents first
  });

  const results = [];
  let remainingToWithdraw = requestedAmount; // undefined means ALL

  for (const agent of agents) {
    if (remainingToWithdraw !== undefined && remainingToWithdraw <= 0) break;
    if (!agent.walletSecret || !agent.hederaAccountId) continue;

    try {
      const privateKey = decryptPrivateKey(agent.walletSecret.privateKeyEncrypted);
      const reserve = 10;
      const chainBalanceResult = await getHederaBalance(agent.hederaAccountId);
      if (chainBalanceResult.status === "error") {
        results.push({ agent: agent.name, amount: 0, error: "Failed to fetch on-chain balance", status: "FAILED" });
        continue;
      }

      const chainBalance = chainBalanceResult.status === "mocked" ? agent.balance : chainBalanceResult.balance;
      if (chainBalanceResult.status === "success") {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { balance: chainBalance },
        });
      }
      const maxAvailable = chainBalance - reserve; 

      if (maxAvailable <= 0) {
        results.push({ agent: agent.name, amount: 0, error: `On-chain balance too low (${chainBalance.toFixed(2)} HBAR)`, status: "FAILED" });
        continue;
      }

      let amount = parseFloat(maxAvailable.toFixed(2));

      // If specific amount requested, take only what is needed
      if (remainingToWithdraw !== undefined) {
          if (amount > remainingToWithdraw) {
              amount = remainingToWithdraw;
          }
      }

      // Check if amount is actually > 0 before sending
      if (amount <= 0) continue;

      const tx = await sendHbarPayment({
        fromAccountId: agent.hederaAccountId,
        fromPrivateKey: privateKey,
        toAccountId: targetAddress,
        amount: amount
      });

      if (tx.status === "SUCCESS" || tx.status === "mocked") {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { balance: { decrement: amount } }
        });

        await prisma.transaction.create({
            data: {
                fromAgentId: agent.id,
                toAgentId: undefined, // Prisma expects undefined or null for optional relations, but 'toAgentId' is a String? field.
                amount: amount,
                txId: tx.transactionId, // Schema uses txId, not transactionId
                status: "completed",
                createdAt: new Date() // Schema uses createdAt, not timestamp
            }
        });

        results.push({ agent: agent.name, amount, txId: tx.transactionId, status: "SUCCESS", chainBalance: chainBalance.toFixed(2) });
        
        if (remainingToWithdraw !== undefined) {
            remainingToWithdraw -= amount;
        }
      } else {
        results.push({ agent: agent.name, amount, error: tx.status, status: "FAILED", chainBalance: chainBalance.toFixed(2) });
      }
    } catch (error) {
      console.error(`Withdraw failed for ${agent.name}:`, error);
      results.push({ agent: agent.name, error: String(error), status: "FAILED" });
    }
  }

  return results;
};
