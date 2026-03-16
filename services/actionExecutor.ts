import { prisma } from "@/lib/db";
import { addActivity } from "@/lib/activityStore";
import { getAgentSecret, updateAgentBalance } from "@/lib/agentStore";
import { addTransaction } from "@/lib/transactionStore";
import { sendHbarPayment, sendBatchHbarPayment, createHederaToken } from "@/blockchain/hederaClient";
import { getDuePayments } from "@/services/paymentService";

// Helper for next scheduled date
const calculateNextSchedule = (current: Date, interval: string): Date => {
  const next = new Date(current);
  if (interval === "Daily") next.setDate(next.getDate() + 1);
  else if (interval === "Weekly") next.setDate(next.getDate() + 7);
  else if (interval === "Monthly") next.setMonth(next.getMonth() + 1);
  return next;
};

const getPaymentCredits = async (agentId: string) => {
  const records = await prisma.agentMemory.findMany({
    where: {
      agentId,
      key: { in: ["payment_credits_total", "payment_credits_used"] },
    },
  });
  const totalRaw = records.find((r) => r.key === "payment_credits_total")?.value;
  if (!totalRaw) return null;
  const usedRaw = records.find((r) => r.key === "payment_credits_used")?.value ?? "0";
  const total = Number(totalRaw);
  const used = Number(usedRaw);
  const remaining = Math.max(0, total - used);
  return { total, used, remaining };
};

const incrementPaymentCredits = async (agentId: string, delta: number) => {
  const current = await getPaymentCredits(agentId);
  if (!current) return null;
  const nextUsed = Math.min(current.total, current.used + delta);
  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId, key: "payment_credits_used" } },
    update: { value: String(nextUsed), type: "long_term" },
    create: { agentId, key: "payment_credits_used", value: String(nextUsed), type: "long_term" },
  });
  return { ...current, used: nextUsed, remaining: Math.max(0, current.total - nextUsed) };
};

const runningPaymentBatches = new Set<string>();

export const executePaymentBatch = async (agentId: string) => {
  if (runningPaymentBatches.has(agentId)) return { count: 0, failed: 0 };
  runningPaymentBatches.add(agentId);

  const duePayments = await getDuePayments(agentId);

  if (duePayments.length === 0) {
    runningPaymentBatches.delete(agentId);
    return { count: 0, failed: 0 };
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  const agentSecret = await getAgentSecret(agentId);

  if (!agent || !agentSecret) {
    runningPaymentBatches.delete(agentId);
    // If agent not found, we shouldn't throw error that crashes the poller, just return 0
    // But if we do throw, make sure it's handled.
    // For safety, we just return.
    return { count: 0, failed: 0 };
  }

  let successCount = 0;
  let failCount = 0;
  // Use a fresh query for balance to ensure we have the absolute latest before execution loop
  let availableBalance = agent.balance;
  const isPaymentOperator = agent.role === "payment_operator";
  let credits = isPaymentOperator ? await getPaymentCredits(agentId) : null;
  const riskLists = await loadRiskLists(agentId);

  try {
    for (const payment of duePayments) {
      try {
        const claimed = await prisma.payment.updateMany({
          where: { id: payment.id, status: { in: ["scheduled", "pending"] } },
          data: { status: "executing" },
        });
        if (claimed.count === 0) continue;

        // --- START BALANCE CHECK ---
        // We do this check AFTER claiming the task to avoid race conditions, but BEFORE sending.
        // If balance is too low, we revert the status to 'paused' instead of 'failed' to stop the retry loop.
        if (availableBalance < payment.amount) {
           await prisma.payment.update({
               where: { id: payment.id },
               data: { status: "paused", description: `Paused: Insufficient funds (${availableBalance} < ${payment.amount})` }
           });
           await prisma.agentLog.create({
               data: {
                   agentId,
                   paymentId: payment.id,
                   level: "warn",
                   title: "Payment Paused",
                   message: `Insufficient funds (${availableBalance} < ${payment.amount}). Task paused.`,
               }
           });
           continue;
        }
        // --- END BALANCE CHECK ---

        const risk = await evaluateRecipientRisk(payment.recipientAddress, payment.amount, riskLists);
        if (risk.isBlacklisted || risk.level === "DANGEROUS") {
           await prisma.payment.update({
               where: { id: payment.id },
               data: { status: "paused", description: `Blocked by Risk Monitor: ${risk.reasons.join(", ")}` }
           });
           await prisma.agentLog.create({
               data: {
                   agentId,
                   paymentId: payment.id,
                   level: "warn",
                   title: "Risk Blocked",
                   message: `Payment blocked (${risk.level}). Score ${risk.score}.`,
                   data: JSON.stringify({ recipient: payment.recipientAddress, reasons: risk.reasons })
               }
           });
           await prisma.activity.create({
               data: {
                   agentId,
                   type: "risk_warning",
                   title: "Payment Blocked",
                   detail: `Blocked ${payment.amount} HBAR to ${payment.recipientAddress}`,
               }
           });
           await prisma.blockchainEvent.create({
               data: {
                   agentId,
                   eventType: "risk_blocked",
                   detail: `Blocked ${payment.amount} HBAR to ${payment.recipientAddress} (score ${risk.score})`,
                   txId: `payment:${payment.id}`,
               }
           });
           continue;
        }

        if (isPaymentOperator && credits && credits.remaining <= 0) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "paused",
              description: "Paused: Reserved credits exhausted",
            },
          });
          await prisma.agentLog.create({
            data: {
              agentId,
              paymentId: payment.id,
              level: "warn",
              title: "Payment Paused",
              message: "Reserved credits exhausted. Top up credits to continue.",
            },
          });
          continue;
        }

        await prisma.agentLog.deleteMany({
          where: { paymentId: payment.id },
        });

        await prisma.agentLog.create({
          data: {
              agentId,
              paymentId: payment.id,
              level: "info",
              title: "Payment Execution",
              message: `Executing payment to ${payment.recipientAddress}...`,
              data: JSON.stringify({ amount: payment.amount, type: payment.executionType })
          }
        });

        if (availableBalance < payment.amount) {
          // This block is now handled by the check above, but keeping it for safety if the code flow changes
          throw new Error(`Insufficient funds. Required: ${payment.amount}, Available: ${availableBalance}`);
        }

        if (payment.amount > 10000) {
           await prisma.payment.update({
               where: { id: payment.id },
               data: { status: "paused", description: "Paused by AI: Amount exceeds safety limit" }
           });
           await prisma.agentLog.create({
               data: {
                   agentId,
                   paymentId: payment.id,
                   level: "warn",
                   title: "Safety Check Alert",
                   message: `Payment paused: Amount ${payment.amount} exceeds auto-limit.`,
               }
           });
           continue;
        }

        type HederaTx = { status: string; transactionId: string };
        let tx: HederaTx;
        
        // Handle Batch vs Single
        if (payment.batchDetails) {
            try {
                const batchRecipients = JSON.parse(payment.batchDetails) as { address: string, amount: number }[];
                const batchTransfers = batchRecipients.map(r => ({ toAccountId: r.address, amount: r.amount }));
                
                await prisma.agentLog.create({
                    data: {
                        agentId,
                        paymentId: payment.id,
                        level: "info",
                        title: "Batch Execution",
                        message: `Sending atomic batch to ${batchRecipients.length} recipients...`,
                    }
                });

                tx = await sendBatchHbarPayment({
                    fromAccountId: agent.hederaAccountId!,
                    fromPrivateKey: agentSecret.privateKey,
                    transfers: batchTransfers
                });

            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : "Unknown error";
                throw new Error(`Batch parsing/execution failed: ${message}`);
            }
        } else {
            tx = await sendHbarPayment({
              fromAccountId: agent.hederaAccountId!,
              fromPrivateKey: agentSecret.privateKey,
              toAccountId: payment.recipientAddress,
              amount: payment.amount,
            });
        }

        if (tx.status !== "SUCCESS" && tx.status !== "mocked") {
            throw new Error(`Hedera Transaction Failed: ${tx.status}`);
        }

        const now = new Date().toISOString();
        // Fix: Use Date object for createdAt if required by Prisma, or valid ISO string
        const timestamp = new Date();
        
        // Fix: prisma.transaction.create requires 'createdAt' to be a valid Date object or ISO string that can be parsed.
        // We ensure we pass a valid ISO string.
        await addTransaction({
          fromAgentId: agent.id,
          toAgentId: null, // Must be null if sending to external address (not an internal agent)
          amount: payment.amount,
          transactionId: tx.transactionId,
          status: "completed",
          timestamp: timestamp.toISOString(),
        });

        await updateAgentBalance(agent.id, -payment.amount);
        availableBalance = Number((availableBalance - payment.amount).toFixed(8));

        const isRecurring = Boolean(payment.recurringInterval);
        if (isRecurring) {
          // If the scheduled time was in the past, we need to ensure the next schedule is in the future.
          // Otherwise, the poller will immediately pick it up again (infinite loop of catch-up payments).
          let baseSchedule = payment.scheduleAt ? new Date(payment.scheduleAt) : new Date();
          const now = new Date();
          
          // If baseSchedule is invalid or way off, reset to now
          if (isNaN(baseSchedule.getTime())) baseSchedule = now;

          let nextDate = calculateNextSchedule(baseSchedule, payment.recurringInterval!);

          // Catch-up logic: If nextDate is still in the past (e.g. missed 3 days), 
          // keep adding intervals until it's in the future.
          while (nextDate <= now) {
            nextDate = calculateNextSchedule(nextDate, payment.recurringInterval!);
          }

          const waitLabel =
            payment.recurringInterval === "Daily"
              ? "tomorrow"
              : payment.recurringInterval === "Weekly"
                ? "next week"
                : "next month";
          
          // Ensure nextDate is a valid Date object before passing to Prisma
          const validNextDate = isNaN(nextDate.getTime()) ? new Date(Date.now() + 86400000) : nextDate;
          const executedAtDate = new Date();

          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "scheduled",
              scheduleAt: validNextDate,
              executedAt: executedAtDate,
              txId: tx.transactionId,
              retryCount: 0,
            },
          });

          await prisma.agentLog.create({
            data: {
              agentId,
              paymentId: payment.id,
              level: "info",
              title: "Recurring Waiting",
              message: `Waiting send for ${waitLabel} (${validNextDate.toLocaleString()})`,
            },
          });
        } else {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "completed",
              executedAt: timestamp,
              txId: tx.transactionId,
            },
          });
        }

        await prisma.agentLog.create({
          data: {
              agentId,
              paymentId: payment.id,
              level: "success",
              title: "Payment Success",
              message: `Sent ${payment.amount} HBAR`,
              data: JSON.stringify({ txId: tx.transactionId, recipient: payment.recipientAddress })
          }
        });

        if (isPaymentOperator && credits) {
          credits = await incrementPaymentCredits(agentId, 1);
        }

        successCount++;
      } catch (error: unknown) {
        failCount++;
        const errMessage = error instanceof Error ? error.message : String(error);
        
        const maxRetries = 3;
        const currentRetries = payment.retryCount || 0;
        const isInstant = payment.executionType === "Instant";

        // Filter out technical errors that should not be retried immediately or spammed
        const isBalanceError = errMessage.includes("INSUFFICIENT_ACCOUNT_BALANCE");
        const isDbError = errMessage.includes("prisma") || errMessage.includes("Foreign key");

        // If it's a technical/DB error, pause immediately to prevent spam loop
        if (isDbError) {
             await prisma.payment.update({
                where: { id: payment.id },
                data: { status: "paused", description: `Paused: Technical Error. ${errMessage.slice(0, 50)}...` }
            });
            await prisma.agentLog.create({
                data: {
                    agentId,
                    paymentId: payment.id,
                    level: "error",
                    title: "Payment Paused (Tech Error)",
                    message: `Task paused due to database/system error. Check logs.`,
                    data: JSON.stringify({ error: errMessage })
                }
            });
            continue;
        }

        if (!isInstant && currentRetries < maxRetries) {
            const retryTime = new Date(Date.now() + 5 * 60 * 1000); 
            await prisma.payment.update({
                where: { id: payment.id },
                data: { 
                    status: "scheduled", 
                    scheduleAt: retryTime,
                    retryCount: currentRetries + 1 
                },
            });
            await prisma.agentLog.create({
              data: {
                  agentId,
                  paymentId: payment.id,
                  level: "warn",
                  title: "Payment Retrying",
                  message: `Execution failed. Retrying in 5 mins (Attempt ${currentRetries + 1}/${maxRetries}). Error: ${errMessage}`,
              }
            });
        } else {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: "failed" },
            });
            
            await prisma.agentLog.create({
              data: {
                  agentId,
                  paymentId: payment.id,
                  level: "error",
                  title: "Payment Failed",
                  message: isInstant ? `Instant payment failed. ${errMessage}` : `Failed after ${maxRetries} retries. ${errMessage}`,
                  data: JSON.stringify({ error: String(error) })
              }
            });
        }
      }
    }

    return { count: successCount, failed: failCount };
  } finally {
    runningPaymentBatches.delete(agentId);
  }
};

export const executeTokenLaunches = async (agentId: string) => {
  const launches = await prisma.tokenLaunch.findMany({
    where: { agentId, status: "PENDING" },
  });

  if (launches.length === 0) return { count: 0, failed: 0 };

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  const agentSecret = await getAgentSecret(agentId);

  if (!agent || !agentSecret) {
    throw new Error("Agent or wallet secret not found for token launch");
  }

  let successCount = 0;
  let failCount = 0;

  for (const launch of launches) {
    try {
      // 1. Lock
      await prisma.tokenLaunch.update({
        where: { id: launch.id },
        data: { status: "EXECUTING" },
      });

      await prisma.agentLog.create({
        data: {
          agentId,
          tokenLaunchId: launch.id,
          level: "info",
          title: "Token Launch Initiated",
          message: `Creating token ${launch.name} (${launch.symbol})...`,
          data: JSON.stringify(launch),
        },
      });

      // 2. Execute
      const result = await createHederaToken({
        accountId: agent.hederaAccountId!,
        privateKey: agentSecret.privateKey,
        name: launch.name,
        symbol: launch.symbol,
        decimals: launch.decimals,
        initialSupply: launch.initialSupply,
        treasuryAccountId: launch.treasuryAccount || agent.hederaAccountId!,
      });

      // 3. Update State
      if (result.status === "SUCCESS") {
        await prisma.tokenLaunch.update({
          where: { id: launch.id },
          data: {
            status: "COMPLETED",
            tokenId: result.tokenId,
            txId: result.transactionId,
          },
        });

        await prisma.agentLog.create({
          data: {
            agentId,
            tokenLaunchId: launch.id,
            level: "success",
            title: "Token Created Successfully",
            message: `Minted ${launch.initialSupply} ${launch.symbol}. ID: ${result.tokenId}`,
            data: JSON.stringify(result),
          },
        });
        successCount++;
      } else {
        throw new Error(`Hedera status: ${result.status}`);
      }
    } catch (error: unknown) {
      failCount++;
      const message = error instanceof Error ? error.message : String(error);
      await prisma.tokenLaunch.update({
        where: { id: launch.id },
        data: { status: "FAILED", error: message },
      });

      await prisma.agentLog.create({
        data: {
          agentId,
          tokenLaunchId: launch.id,
          level: "error",
          title: "Token Launch Failed",
          message,
        },
      });
    }
  }

  return { count: successCount, failed: failCount };
};

export const rebalanceTreasury = async (agentId: string, targetAllocation: unknown) => {
    // Treasury logic
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if(!agent) return { status: "error" };

    // Real logic: Check if balance is too low
    if (agent.balance < 100) {
         await prisma.agentLog.create({
            data: {
                agentId,
                level: "warn",
                title: "Treasury Low",
                message: `Balance ${agent.balance} below threshold (100).`,
                data: JSON.stringify({ balance: agent.balance })
            }
        });
        return { status: "alert_sent", details: "Low balance alert" };
    }

    await prisma.agentLog.create({
        data: {
            agentId,
            level: "info",
            title: "Treasury Health",
            message: "Balance healthy. No rebalance needed.",
            data: JSON.stringify({ balance: agent.balance })
        }
    });
    return { status: "healthy", details: "Balance OK" };
};

type RiskLevel = "SAFE" | "SUSPICIOUS" | "DANGEROUS";

type PaymentRisk = {
    id: string;
    recipientAddress: string;
    amount: number;
    score: number;
    level: RiskLevel;
    reasons: string[];
    contractStatus?: string;
    contractReason?: string;
    blocked: boolean;
};

type TransactionRisk = {
    id: string;
    txId: string | null;
    amount: number;
    score: number;
    level: RiskLevel;
    reasons: string[];
};

type ContractWatch = { address: string; reason: string };

const DEFAULT_BLACKLIST = ["0.0.666", "0.0.31337", "0.0.99999"];
const DEFAULT_WATCHLIST: ContractWatch[] = [
    { address: "0.0.54321", reason: "Proxy upgradeable" },
    { address: "0.0.88888", reason: "Upgradeable admin" },
];

const BLACKLIST_KEY = "risk_blacklist";
const WATCHLIST_KEY = "risk_contract_watchlist";

const loadRiskLists = async (agentId: string) => {
    const [blacklistRaw, watchlistRaw] = await Promise.all([
        prisma.agentMemory.findUnique({
            where: { agentId_key: { agentId, key: BLACKLIST_KEY } },
        }),
        prisma.agentMemory.findUnique({
            where: { agentId_key: { agentId, key: WATCHLIST_KEY } },
        }),
    ]);

    let blacklist = DEFAULT_BLACKLIST;
    let watchlist = DEFAULT_WATCHLIST;

    if (blacklistRaw?.value) {
        try {
            const parsed = JSON.parse(blacklistRaw.value) as string[];
            if (Array.isArray(parsed)) blacklist = parsed;
        } catch {}
    }

    if (watchlistRaw?.value) {
        try {
            const parsed = JSON.parse(watchlistRaw.value) as ContractWatch[];
            if (Array.isArray(parsed)) watchlist = parsed;
        } catch {}
    }

    return { blacklist, watchlist };
};

const scoreToLevel = (score: number): RiskLevel => {
    if (score >= 80) return "DANGEROUS";
    if (score >= 50) return "SUSPICIOUS";
    return "SAFE";
};

const evaluateRecipientRisk = async (
    recipientAddress: string,
    amount: number,
    lists: { blacklist: string[]; watchlist: ContractWatch[] },
) => {
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [recentCount, firstSeen] = await Promise.all([
        prisma.payment.count({
            where: { recipientAddress, createdAt: { gte: oneHourAgo } },
        }),
        prisma.payment.findFirst({
            where: { recipientAddress },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
        }),
    ]);

    const isBlacklisted = lists.blacklist.includes(recipientAddress);
    const watchEntry = lists.watchlist.find((c) => c.address === recipientAddress);
    const isSuspiciousContract = Boolean(watchEntry);
    const isNewWallet = !firstSeen || firstSeen.createdAt > oneDayAgo;

    let score = 0;
    const reasons: string[] = [];

    if (amount > 5000) {
        score += 40;
        reasons.push("Transfer besar");
    } else if (amount > 1000) {
        score += 25;
        reasons.push("Nilai di atas batas aman");
    } else if (amount > 200) {
        score += 10;
    }

    if (isNewWallet) {
        score += 20;
        reasons.push("Wallet baru terdeteksi");
    }

    if (recentCount >= 3) {
        score += 25;
        reasons.push("Sering menerima dalam waktu singkat");
    }

    if (isSuspiciousContract) {
        score += 20;
        reasons.push("Kontrak mencurigakan");
    }

    if (isBlacklisted) {
        score = 100;
        reasons.push("Alamat masuk blacklist");
    }

    const level = scoreToLevel(score);
    return {
        score,
        level,
        reasons,
        isBlacklisted,
        contractStatus: isSuspiciousContract ? "Suspicious" : "Safe",
        contractReason: watchEntry?.reason,
        recentCount,
        isNewWallet,
    };
};

export const scanForRisks = async (agentId: string) => {
    const [recentTx, recentPayments] = await Promise.all([
        prisma.transaction.findMany({
            orderBy: { createdAt: "desc" },
            take: 25
        }),
        prisma.payment.findMany({
            orderBy: { createdAt: "desc" },
            take: 25
        }),
    ]);

    const lists = await loadRiskLists(agentId);
    const riskyPayments: PaymentRisk[] = [];
    const riskyTransactions: TransactionRisk[] = [];
    const walletSignals: { address: string; reason: string }[] = [];
    const blacklistHits = new Set<string>();

    for (const payment of recentPayments) {
        const risk = await evaluateRecipientRisk(payment.recipientAddress, payment.amount, lists);
        const blocked = risk.isBlacklisted || risk.level === "DANGEROUS";

        if (risk.isBlacklisted) {
            blacklistHits.add(payment.recipientAddress);
        }

        if (risk.isNewWallet) {
            walletSignals.push({ address: payment.recipientAddress, reason: "Wallet baru" });
        }

        if (risk.recentCount >= 3) {
            walletSignals.push({ address: payment.recipientAddress, reason: "Sering menerima" });
        }

        if (risk.level !== "SAFE") {
            const eventId = `payment:${payment.id}`;
            const eventType = blocked ? "risk_blocked" : "risk_detected";
            const existing = await prisma.blockchainEvent.findFirst({
                where: { txId: eventId, eventType },
            });

            if (!existing) {
                await prisma.blockchainEvent.create({
                    data: {
                        agentId: agentId === "system" ? undefined : agentId,
                        eventType,
                        detail: `${eventType === "risk_blocked" ? "Blocked" : "Detected"} ${payment.amount} HBAR to ${payment.recipientAddress} (score ${risk.score})`,
                        txId: eventId,
                    },
                });
            }
        }

        riskyPayments.push({
            id: payment.id,
            recipientAddress: payment.recipientAddress,
            amount: payment.amount,
            score: risk.score,
            level: risk.level,
            reasons: risk.reasons,
            contractStatus: risk.contractStatus,
            contractReason: risk.contractReason,
            blocked,
        });
    }

    for (const tx of recentTx) {
        let score = 0;
        const reasons: string[] = [];
        if (tx.amount > 5000) {
            score = 70;
            reasons.push("Transfer sangat besar");
        } else if (tx.amount > 1000) {
            score = 50;
            reasons.push("Transfer besar");
        }

        const level = scoreToLevel(score);
        if (level !== "SAFE") {
            riskyTransactions.push({
                id: tx.id,
                txId: tx.txId,
                amount: tx.amount,
                score,
                level,
                reasons,
            });
        }
    }

    const risksFound =
        riskyPayments.filter((p) => p.level !== "SAFE").length +
        riskyTransactions.length;

    const blockedCount = riskyPayments.filter((p) => p.blocked).length;

    return {
        risksFound,
        blockedCount,
        riskyPayments,
        riskyTransactions,
        walletSignals,
        blacklistHits: Array.from(blacklistHits),
        blacklist: lists.blacklist,
        contractWatchlist: lists.watchlist,
    };
};
