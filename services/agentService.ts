import type { Agent, AgentRole, CreateAgentInput } from "@/types/agent";
import { prisma } from "@/lib/db";
import { createAgentWallet } from "@/blockchain/hederaClient";
import { encryptPrivateKey } from "@/services/walletService";

const roleStatusMap: Record<AgentRole, Agent["status"]> = {
  treasury_manager: "Running",
  payment_operator: "Running",
  blockchain_monitor: "Running",
  risk_manager: "Running",
  market_analyst: "Running",
  token_creator: "Running",
};

const strategyByRole: Record<AgentRole, Agent["strategy"]> = {
  treasury_manager: "Defensive",
  payment_operator: "Momentum",
  blockchain_monitor: "Opportunity-Seeking",
  risk_manager: "Defensive",
  market_analyst: "Opportunity-Seeking",
  token_creator: "Momentum",
};

const riskByRole: Record<AgentRole, Agent["riskLevel"]> = {
  treasury_manager: "Low",
  payment_operator: "Medium",
  blockchain_monitor: "Low",
  risk_manager: "Low",
  market_analyst: "Medium",
  token_creator: "High",
};

const decisionByRole: Record<AgentRole, Agent["decisionStyle"]> = {
  treasury_manager: "Conservative",
  payment_operator: "Fast",
  blockchain_monitor: "Analytical",
  risk_manager: "Conservative",
  market_analyst: "Analytical",
  token_creator: "Fast",
};

const permissionsByRole: Record<AgentRole, string[]> = {
  treasury_manager: ["treasury:read", "treasury:allocate"],
  payment_operator: ["payments:read", "payments:execute"],
  blockchain_monitor: ["chain:read", "alerts:write"],
  risk_manager: ["risk:read", "risk:alert"],
  market_analyst: ["analysis:read", "analysis:write"],
  token_creator: ["token:create", "token:manage"],
};

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
});

export const createAgent = async (input: CreateAgentInput) => {
  const role = input.role ?? "treasury_manager";
  const wallet = await createAgentWallet();
  const encryptedKey = encryptPrivateKey(wallet.privateKey);

  const agent = await prisma.agent.create({
    data: {
      name: input.name,
      role,
      permissions: JSON.stringify(permissionsByRole[role] ?? []),
      operationalStatus: "active",
      strategy: strategyByRole[role],
      riskLevel: riskByRole[role],
      decisionStyle: decisionByRole[role],
      hederaAccountId: wallet.accountId,
      hederaPublicKey: wallet.publicKey,
      status: roleStatusMap[role],
      reputation: Math.floor(50 + Math.random() * 45),
      balance: Number((wallet.initialBalance ?? 0).toFixed(2)),
      walletSecret: {
        create: {
          privateKeyEncrypted: encryptedKey,
        },
      },
      activities: {
        create: {
          type: "agent_created",
          message: JSON.stringify({
            title: "Agent created",
            detail: `${input.name} initialized with ${role} protocols`,
          }),
        },
      },
    },
  });

  return mapAgent(agent);
};

export const listAgents = async () => {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
  });
  return agents.map(mapAgent);
};

export const getAgent = async (agentId: string) => {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });
  return agent ? mapAgent(agent) : null;
};
