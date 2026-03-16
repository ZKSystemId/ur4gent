import type { TransactionRecord } from "@/types/transaction";
import { prisma } from "@/lib/db";

export const getTransactions = async () => {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
  });
  return transactions.map<TransactionRecord>((transaction) => ({
    id: transaction.id,
    fromAgentId: transaction.fromAgentId,
    toAgentId: transaction.toAgentId,
    amount: transaction.amount,
    transactionId: transaction.txId,
    timestamp: transaction.createdAt.toISOString(),
  }));
};

export const addTransaction = async (input: Omit<TransactionRecord, "id"> & { status?: string }) => {
  // Use current time for DB creation to avoid Invalid Date issues
  const now = new Date();

  console.log("Adding transaction:", JSON.stringify({
      ...input,
      timestamp: now.toISOString() // Log what we're using
  }));

  try {
      const record = await prisma.transaction.create({
        data: {
          txId: input.transactionId,
          fromAgentId: input.fromAgentId,
          toAgentId: input.toAgentId,
          amount: input.amount,
          status: input.status || "submitted",
          createdAt: now,
        },
      });
      return {
        id: record.id,
        fromAgentId: record.fromAgentId,
        toAgentId: record.toAgentId,
        amount: record.amount,
        transactionId: record.txId,
        timestamp: record.createdAt.toISOString(),
      } satisfies TransactionRecord;
  } catch (error) {
      console.error("Prisma Transaction Create Error:", error);
      throw error;
  }
};
