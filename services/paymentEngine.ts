import { executePaymentBatch } from "@/services/actionExecutor";
import { prisma } from "@/lib/db";

export const runPaymentEngine = async (agentId: string) => {
  const result = await executePaymentBatch(agentId);
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      lastExecution: new Date(),
      aiDecisionLog: `execute_payment: ${JSON.stringify(result)}`,
    },
  });
  return result;
};

