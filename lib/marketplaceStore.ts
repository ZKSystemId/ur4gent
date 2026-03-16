import { prisma } from "@/lib/db";
import type { AgentTemplate } from "@prisma/client";

export const getAgentTemplates = async () => {
  return prisma.agentTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const getAgentTemplateById = async (id: string) => {
  return prisma.agentTemplate.findUnique({
    where: { id },
  });
};
