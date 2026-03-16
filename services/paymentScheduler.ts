import { createPayment } from "@/services/paymentService";

export const schedulePayment = async (input: {
  agentId: string;
  toAccountId: string;
  amount: number;
  scheduleAt: string;
  memo?: string;
}) => {
  return createPayment({
    agentId: input.agentId,
    recipientAddress: input.toAccountId,
    amount: input.amount,
    token: "HBAR",
    category: "Treasury",
    executionType: "Scheduled",
    scheduleAt: input.scheduleAt,
    description: input.memo,
  });
};

