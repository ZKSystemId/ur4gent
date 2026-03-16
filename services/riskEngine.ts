import { scanForRisks } from "@/services/actionExecutor";
import { prisma } from "@/lib/db";

export const runRiskEngine = async (agentId: string) => {
  const { risksFound, blockedCount } = await scanForRisks(agentId);
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      lastExecution: new Date(),
      aiDecisionLog: `scan_transactions: ${risksFound} blocked:${blockedCount}`,
    },
  });
  return { risksFound, blockedCount };
};
