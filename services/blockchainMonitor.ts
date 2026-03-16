import { prisma } from "@/lib/db";
import { addActivity } from "@/lib/activityStore";

let lastSeenTxId: string | null = null;

export const recordBlockchainEvent = async (input: {
  agentId?: string;
  eventType: string;
  detail: string;
  txId?: string;
}) => {
  try {
    const created = await prisma.blockchainEvent.create({
      data: {
        agentId: input.agentId,
        eventType: input.eventType,
        detail: input.detail,
        txId: input.txId,
      },
    });

    await addActivity({
      type: "blockchain_event",
      title: input.eventType,
      detail: input.detail,
      agentId: input.agentId,
    });

    return created;
  } catch (error) {
    console.error("Failed to record blockchain event:", error);
    return null;
  }
};

export const getBlockchainEvents = async (limit = 5) => {
  try {
    return await prisma.blockchainEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("Failed to load blockchain events:", error);
    return [];
  }
};

export const pollBlockchainActivity = async () => {
  // This function simulates listening to the chain
  // In a real app, this would use a Mirror Node subscription
  let latestTx: { txId: string | null; amount: number; fromAgentId: string | null } | null = null;
  try {
    latestTx = await prisma.transaction.findFirst({
      select: { txId: true, amount: true, fromAgentId: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to poll blockchain activity:", error);
    return null;
  }

  if (!latestTx || latestTx.txId === lastSeenTxId) {
    return null;
  }

  lastSeenTxId = latestTx.txId;

  // We only record if it's new
  const event = await recordBlockchainEvent({
    agentId: latestTx.fromAgentId ?? undefined,
    eventType: "transaction_detected",
    detail: `Detected transfer ${latestTx.amount} HBAR (tx ${latestTx.txId})`,
    txId: latestTx.txId ?? undefined,
  });

  return event;
};
