import type { Agent, AgentRole, CreateAgentInput } from "@/types/agent";
import { prisma } from "@/lib/db";
import { createAgent } from "@/services/agentService";
import { decryptPrivateKey, encryptPrivateKey } from "@/services/walletService";
import { createAgentWallet } from "@/blockchain/hederaClient";

const mapAgent = (agent: {
  id: string;
  name: string;
  role: string;
  permissions: string;
  operationalStatus: string;
  strategy: string;
  riskLevel: string;
  decisionStyle: string;
  hederaAccountId: string | null;
  hederaPublicKey: string | null;
  reputation: number;
  balance: number;
  status: string;
  expiresAt?: Date | null;
}): Agent => ({
  id: agent.id,
  name: agent.name,
  role: agent.role as AgentRole,
  permissions: JSON.parse(agent.permissions) as string[],
  operationalStatus: agent.operationalStatus as Agent["operationalStatus"],
  strategy: agent.strategy as Agent["strategy"],
  riskLevel: agent.riskLevel as Agent["riskLevel"],
  decisionStyle: agent.decisionStyle as Agent["decisionStyle"],
  hederaAccountId: agent.hederaAccountId,
  publicKey: agent.hederaPublicKey,
  reputation: agent.reputation,
  balance: agent.balance,
  status: agent.status as Agent["status"],
  expiresAt: agent.expiresAt ?? null,
});

export const getAgents = async (ownerId?: string | null) => {
  try {
    const agents = await prisma.agent.findMany({
      where: ownerId ? { ownerId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return agents.map(mapAgent);
  } catch (error) {
    console.error("Failed to load agents:", error);
    return [];
  }
};

export const addAgent = async (input: CreateAgentInput): Promise<Agent> => {
  return createAgent(input);
};

export const getAgentById = async (agentId: string) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });
    return agent ? mapAgent(agent) : null;
  } catch (error) {
    console.error("Failed to load agent:", error);
    return null;
  }
};

export const getAgentByRole = async (role: AgentRole) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { role },
      orderBy: { createdAt: "desc" },
    });
    return agent ? mapAgent(agent) : null;
  } catch (error) {
    console.error("Failed to load agent by role:", error);
    return null;
  }
};

export const getAgentSecret = async (agentId: string) => {
  const secret = await prisma.walletSecret.findUnique({
    where: { agentId },
  });
  if (!secret) return null;
  return { privateKey: decryptPrivateKey(secret.privateKeyEncrypted) };
};

export const updateAgentBalance = async (agentId: string, delta: number) => {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return;
  const updatedBalance = Number((agent.balance + delta).toFixed(2));
  await prisma.agent.update({
    where: { id: agentId },
    data: { balance: updatedBalance },
  });
};

export const updateAgentOperationalStatus = async (
  agentId: string,
  status: Agent["operationalStatus"],
) => {
  await prisma.agent.update({
    where: { id: agentId },
    data: { operationalStatus: status },
  });
};

export const ensureAgentWallet = async (agentId: string) => {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });
  if (!agent) return null;

  const existingSecret = await prisma.walletSecret.findUnique({
    where: { agentId },
  });
  if (agent.hederaAccountId && existingSecret) {
    return mapAgent(agent);
  }

  const wallet = await createAgentWallet();
  const encryptedKey = encryptPrivateKey(wallet.privateKey);

  const updated = await prisma.agent.update({
    where: { id: agentId },
    data: {
      hederaAccountId: wallet.accountId,
      hederaPublicKey: wallet.publicKey,
      balance: Number((wallet.initialBalance ?? 0).toFixed(2)),
    },
  });

  await prisma.walletSecret.upsert({
    where: { agentId },
    update: { privateKeyEncrypted: encryptedKey },
    create: { agentId, privateKeyEncrypted: encryptedKey },
  });

  return mapAgent(updated);
};
