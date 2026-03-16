import { prisma } from "@/lib/db";

export const createTokenLaunch = async (agentId: string, data: {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  treasuryAccount?: string;
}) => {
  return prisma.tokenLaunch.create({
    data: {
      agentId,
      ...data,
      status: "PENDING",
    },
  });
};

export const getTokenLaunches = async (agentId: string) => {
  return prisma.tokenLaunch.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
  });
};

export const updateTokenLaunchStatus = async (id: string, status: string, details?: { tokenId?: string; txId?: string; error?: string }) => {
  return prisma.tokenLaunch.update({
    where: { id },
    data: {
      status,
      ...details,
    },
  });
};

export const deleteTokenLaunch = async (id: string) => {
  return prisma.tokenLaunch.delete({
    where: { id },
  });
};
