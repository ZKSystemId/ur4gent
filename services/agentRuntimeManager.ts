import { prisma } from "@/lib/db";
import { runOperationsCycle } from "@/services/operationsEngine";

// In-memory set of active agent intervals
const activeTimers = new Map<string, NodeJS.Timeout>();

const ENABLE_INTERVAL_RUNTIME = process.env.NODE_ENV !== "production";

export const startAgentRuntime = async (agentId: string) => {
  if (activeTimers.has(agentId)) return; // Already running

  console.log(`Starting runtime for agent ${agentId}`);
  
  // Set status in DB
  try {
    await prisma.agent.update({
      where: { id: agentId },
      data: { operationalStatus: "active" }
    });
  } catch (error) {
    console.error("Failed to update agent status:", error);
  }

  if (ENABLE_INTERVAL_RUNTIME) {
    const timer = setInterval(async () => {
      try {
        await runOperationsCycle(agentId);
      } catch (error) {
        console.error(`Error in agent loop ${agentId}:`, error);
      }
    }, 10000);

    activeTimers.set(agentId, timer);
  }

  await runOperationsCycle(agentId);
};

export const stopAgentRuntime = async (agentId: string) => {
  const timer = activeTimers.get(agentId);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(agentId);
  }

  console.log(`Stopping runtime for agent ${agentId}`);

  try {
    await prisma.agent.update({
      where: { id: agentId },
      data: { operationalStatus: "inactive" } // or "stopped"
    });
  } catch (error) {
    console.error("Failed to update agent status:", error);
  }
};

export const getRuntimeStatus = (agentId: string) => {
  return activeTimers.has(agentId) ? "active" : "inactive";
};

// Initialize runtime for all 'active' agents on server start
export const initializeRuntime = async () => {
  if (!ENABLE_INTERVAL_RUNTIME) return;
  try {
    const activeAgents = await prisma.agent.findMany({
      where: { operationalStatus: "active" }
    });

    for (const agent of activeAgents) {
      startAgentRuntime(agent.id);
    }
  } catch (error) {
    console.error("Failed to initialize runtime:", error);
  }
};
