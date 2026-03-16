import { prisma } from "@/lib/db";
import { addActivity } from "@/lib/activityStore";
import { executePaymentBatch } from "@/services/actionExecutor";

export type CreatePaymentInput = {
  agentId?: string;
  recipientAddress: string;
  amount: number;
  token?: string;
  category: string;
  executionType: string;
  scheduleAt?: string; // ISO date string
  recurringInterval?: string;
  description?: string;
  batchDetails?: string; // JSON string for batch payments
};

export const createPayment = async (input: CreatePaymentInput) => {
  const isInstant = input.executionType === "Instant";
  const scheduleAt =
    input.scheduleAt ??
    (input.executionType === "Recurring" ? new Date().toISOString() : undefined);

  const payment = await prisma.payment.create({
    data: {
      agentId: input.agentId,
      recipientAddress: input.recipientAddress,
      amount: input.amount,
      token: input.token || "HBAR",
      category: input.category,
      executionType: input.executionType,
      scheduleAt: scheduleAt ? new Date(scheduleAt) : null,
      recurringInterval: input.recurringInterval,
      status: isInstant ? "pending" : "scheduled",
      description: input.description,
      batchDetails: input.batchDetails,
    },
  });

  await addActivity({
    type: "payment_created",
    title: "Payment Created",
    detail: `Created ${input.executionType} payment of ${input.amount} ${input.token || "HBAR"}`,
    agentId: input.agentId,
  });

  // REMOVED auto-execute block. User must click Start.
  return payment;
};

export const getPayments = async (agentId?: string) => {
  try {
    return await prisma.payment.findMany({
      where: agentId ? { agentId } : {},
      orderBy: { createdAt: "desc" },
      include: { agent: true },
    });
  } catch (error) {
    console.error("Failed to load payments:", error);
    return [];
  }
};

export const getDuePayments = async (agentId?: string) => {
  try {
    return await prisma.payment.findMany({
      where: {
        agentId: agentId, 
        status: { in: ["scheduled", "pending"] },
        OR: [
          { scheduleAt: { lte: new Date() } },
          { scheduleAt: null }
        ]
      },
    });
  } catch (error) {
    console.error("Failed to load due payments:", error);
    return [];
  }
};

export const setPaymentStatus = async (id: string, status: string) => {
  return prisma.payment.update({
    where: { id },
    data: { status },
  });
};

export const updatePayment = async (
  id: string,
  data: Partial<{
    recipientAddress: string;
    amount: number;
    token: string;
    category: string;
    executionType: string;
    scheduleAt: Date | null;
    recurringInterval: string | null;
    description: string | null;
  }>
) => {
  return prisma.payment.update({
    where: { id },
    data,
  });
};

export const deletePaymentById = async (id: string) => {
  return prisma.payment.delete({ where: { id } });
};
